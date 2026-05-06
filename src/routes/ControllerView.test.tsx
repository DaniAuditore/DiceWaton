// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ControllerView } from './ControllerView';
import { useGameStore } from '../stores/useGameStore';
import { supabase } from '../lib/supabase';

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
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      track: vi.fn().mockResolvedValue({}),
      send: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('ControllerView auth gating', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    useGameStore.getState().reset();
  });

  it('renders auth form when user is unauthenticated', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

    render(<ControllerView />);

    await waitFor(() => {
      expect(screen.getByText('Mock Auth Form')).toBeTruthy();
    });
  });

  it('renders join form when user is authenticated', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });

    render(<ControllerView />);

    await waitFor(() => {
      expect(screen.getByText('Join Game')).toBeTruthy();
    });
  });
});
