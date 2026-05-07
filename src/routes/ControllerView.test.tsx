// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ControllerView } from './ControllerView';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { supabase } from '../lib/supabase';

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  track: vi.fn().mockResolvedValue({}),
  send: vi.fn(),
};

vi.mock('../components/AuthForm', () => ({
  AuthForm: () => <div>Mock Auth Form</div>,
}));

vi.mock('../components/MacroManager', () => ({
  MacroManager: () => <div>Mock Macro Manager</div>,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'controller-1' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    channel: vi.fn(() => ({
      ...mockChannel,
    })),
    removeChannel: vi.fn(),
  },
}));

describe('ControllerView auth gating', () => {
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
    mockChannel.on.mockReturnThis();
    mockChannel.subscribe.mockReturnThis();
    useGameStore.getState().reset();
    useUiStore.setState({ statusByScope: {}, messageByScope: {} });
  });

  it('renders auth form when user is unauthenticated', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

    render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mock Auth Form')).toBeTruthy();
    });
  });

  it('renders join form when user is authenticated', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });

    render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unirse a sala')).toBeTruthy();
    });
  });

  it('subscribes to dice_roll and renders incoming roll details', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });
    useGameStore.getState().setIdentity('controller-1', false);
    useGameStore.getState().setRoom('room-1', 'ABCD');

    render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalledWith('broadcast', { event: 'dice_roll' }, expect.any(Function));
    });

    const diceRollHandler = mockChannel.on.mock.calls.find(
      (call) => call[0] === 'broadcast' && call[1]?.event === 'dice_roll'
    )?.[2];

    diceRollHandler?.({
      payload: {
        id: 'evt-1',
        playerName: 'Ada',
        diceType: 'Fireball (2d6+1)',
        result: 8,
        timestamp: Date.now(),
        details: '2d6[3,4] +1',
      },
    });

    expect(await screen.findByText('tiró Fireball (2d6+1)')).toBeTruthy();
    expect(screen.getByText('2d6[3,4] +1')).toBeTruthy();
  });

  it('shows field-level and summary validation errors on invalid join', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });

    render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unirse a sala')).toBeTruthy();
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Unirse a la sala' }).closest('form') as HTMLFormElement);

    expect((await screen.findAllByText('Revisá los datos para unirte a la sala.')).length).toBeGreaterThan(0);
    expect(screen.getByText('El nombre es obligatorio.')).toBeTruthy();
    expect(screen.getByText('El PIN debe tener 4 caracteres.')).toBeTruthy();
  });

  it('restores a coherent connected state after remount with a valid session', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });

    useGameStore.getState().setIdentity('controller-1', false);
    useGameStore.getState().setRoom('room-1', 'ABCD');
    useGameStore.getState().updateGameState('COMBAT', []);

    const firstRender = render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>
    );

    expect(await screen.findByText('Conectado a la sala')).toBeTruthy();
    expect(screen.getByText('Sala guardada encontrada')).toBeTruthy();
    expect(screen.getByText('ABCD')).toBeTruthy();
    expect(screen.getByText('COMBAT')).toBeTruthy();

    firstRender.unmount();

    render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>
    );

    expect(await screen.findByText('Conectado a la sala')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
    expect(screen.queryByText('Unirse a sala')).toBeNull();
  });

  it('leaves a connected room without signing out', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });
    useGameStore.getState().setIdentity('controller-1', false);
    useGameStore.getState().setRoom('room-1', 'ABCD');

    render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Salir de esta sala' }));

    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(useGameStore.getState().roomId).toBeNull();
    expect(await screen.findByText('Unirse a sala')).toBeTruthy();
    expect(screen.getByText('Saliste de la sala. Tu sesión sigue abierta.')).toBeTruthy();
  });

  it('prepares an intended PIN from the URL before joining', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });

    render(
      <MemoryRouter initialEntries={['/controller?pin=wxyz']}>
        <ControllerView />
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('WXYZ')).toBeTruthy();
    expect(screen.getByText('PIN WXYZ preparado. Iniciá sesión y confirmá tu nombre para unirte.')).toBeTruthy();
  });

  it('clearly blocks join while offline', async () => {
    setOnlineState(false);
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });

    render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>
    );

    expect(await screen.findByText('Unirse requiere internet')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Unirse a la sala' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Podés abrir DiceWaton sin conexión, pero entrar a una sala y tirar dados en vivo requiere red.')).toBeTruthy();
  });

  it('shows connected controller realtime actions as network-required while offline', async () => {
    setOnlineState(false);
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });
    useGameStore.getState().setIdentity('controller-1', false);
    useGameStore.getState().setRoom('room-1', 'ABCD');

    render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>
    );

    expect(await screen.findByText('Tiradas en vivo no disponibles')).toBeTruthy();
    expect(screen.getByText('Necesitás internet para tirar dados en vivo en esta sala.')).toBeTruthy();
  });
});
