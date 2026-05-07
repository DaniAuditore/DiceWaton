// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { ControllerView } from './ControllerView';
import { HostView } from './HostView';
import { useGameStore } from '../stores/useGameStore';
import { supabase } from '../lib/supabase';

vi.mock('../components/AuthForm', () => ({
  AuthForm: () => <div>Mock Auth Form</div>,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInAnonymously: vi.fn().mockResolvedValue({ data: { user: { id: 'host-1' } }, error: null }),
      signOut: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'controller-1' } } }),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'room-1', pin: 'ABCD' }, error: null }),
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

describe('A11y quality gate', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    useGameStore.getState().reset();
  });

  it('controller join form has no critical accessibility violations', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'controller-1' } } },
    });

    const { container, getByText } = render(
      <MemoryRouter>
        <ControllerView />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getByText('Unirse a sala')).toBeTruthy();
    });

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('host management entry has no critical accessibility violations', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

    const { container, getByText } = render(
      <MemoryRouter>
        <HostView />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getByText('Administrar sala')).toBeTruthy();
    });

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
