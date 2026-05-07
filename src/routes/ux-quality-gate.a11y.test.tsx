// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { ControllerView } from './ControllerView';
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

describe('A11y quality gate', () => {
  beforeEach(() => {
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
});
