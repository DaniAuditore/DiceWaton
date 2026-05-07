// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HostView } from '../routes/HostView';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { supabase } from '../lib/supabase';


vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInAnonymously: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  }
}));

describe('Supabase integration lifecycle in HostView', () => {
  const setOnlineState = (online: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: online,
    });
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setOnlineState(true);
    useGameStore.getState().reset();
    useUiStore.setState({ statusByScope: {}, messageByScope: {} });
    
    // Mock basic auth
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    (supabase.auth.signInAnonymously as any).mockResolvedValue({ data: { user: { id: 'anon-1' } } });
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'host-123' } } });
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'room-1', pin: 'ABCD' },
        error: null,
      }),
    });
  });

  it('subscribes to a room channel when roomId is set', async () => {
    // Setup store with room
    useGameStore.getState().setRoom('test-room-id', 'TEST');
    useGameStore.getState().setIdentity('host-123', true);

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      track: vi.fn().mockResolvedValue({}),
      presenceState: vi.fn().mockReturnValue({}),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);

    const { unmount } = render(
      <MemoryRouter>
        <HostView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith('room:test-room-id', expect.any(Object));
    });

    expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
    expect(mockChannel.on).toHaveBeenCalledWith('broadcast', { event: 'dice_roll' }, expect.any(Function));
    expect(mockChannel.subscribe).toHaveBeenCalled();

    // Verify cleanup
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('keeps host access anonymous without auth form', async () => {
    render(
      <MemoryRouter>
        <HostView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(supabase.auth.signInAnonymously).toHaveBeenCalled();
    });

    expect(screen.getByText('Administrar sala')).toBeTruthy();
    expect(screen.queryByText('Sign in to your account')).toBeNull();
  });

  it('shows accessible retry error banner when room creation fails', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

    render(
      <MemoryRouter>
        <HostView />
      </MemoryRouter>
    );

    const button = screen.getAllByRole('button', { name: 'Crear sala' })[0];
    button.click();

    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('shows empty-state guidance after a successful room creation', async () => {
    render(
      <MemoryRouter>
        <HostView />
      </MemoryRouter>
    );

    screen.getByRole('button', { name: 'Crear sala' }).click();

    expect(await screen.findByText('ABCD')).toBeTruthy();
    expect(screen.getByText('Esperando que se unan jugadores...')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Jugadores (0)' })).toBeTruthy();
    expect(screen.getByText('Compartí este PIN: los jugadores lo ingresan en “Unirse a sala”.')).toBeTruthy();
  });

  it('copies the room PIN with accessible feedback', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(
      <MemoryRouter>
        <HostView />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }));

    expect(await screen.findByText('ABCD')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar PIN ABCD' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABCD');
    });
    expect(screen.getByText('PIN ABCD copiado al portapapeles.')).toBeTruthy();
  });

  it('closes the hosted room without signing out identity', async () => {
    useGameStore.getState().setIdentity('host-123', true);
    useGameStore.getState().setRoom('room-1', 'ABCD');

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      track: vi.fn().mockResolvedValue({}),
      presenceState: vi.fn().mockReturnValue({}),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);

    render(
      <MemoryRouter>
        <HostView />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sala' }));

    expect(useGameStore.getState().roomId).toBeNull();
    expect(useGameStore.getState().playerId).toBe('host-123');
    expect(await screen.findByRole('button', { name: 'Crear sala' })).toBeTruthy();
  });

  it('clearly blocks host realtime actions while offline', async () => {
    setOnlineState(false);
    render(
      <MemoryRouter>
        <HostView />
      </MemoryRouter>
    );

    expect(screen.getByText('Acciones en vivo no disponibles')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Crear sala' }) as HTMLButtonElement).disabled).toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('shows context actions as network-required in an existing hosted room', async () => {
    setOnlineState(false);
    useGameStore.getState().setIdentity('host-123', true);
    useGameStore.getState().setRoom('room-1', 'ABCD');

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      track: vi.fn().mockResolvedValue({}),
      presenceState: vi.fn().mockReturnValue({}),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);

    render(
      <MemoryRouter>
        <HostView />
      </MemoryRouter>
    );

    expect(await screen.findByText('Conectate a internet para enviar contexto.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Exploración' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Combate' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Social' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
