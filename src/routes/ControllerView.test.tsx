// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ControllerView } from './ControllerView';
import { useGameStore } from '../stores/useGameStore';
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
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockChannel.on.mockReturnThis();
    mockChannel.subscribe.mockReturnThis();
    useGameStore.getState().reset();
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
      expect(screen.getByText('Join Game')).toBeTruthy();
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

    expect(await screen.findByText('rolled Fireball (2d6+1)')).toBeTruthy();
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
      expect(screen.getByText('Join Game')).toBeTruthy();
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Join Room' }).closest('form') as HTMLFormElement);

    expect(await screen.findByText('Revisá los datos para unirte a la sala.')).toBeTruthy();
    expect(screen.getByText('El nombre es obligatorio.')).toBeTruthy();
    expect(screen.getByText('El PIN debe tener 4 caracteres.')).toBeTruthy();
  });
});
