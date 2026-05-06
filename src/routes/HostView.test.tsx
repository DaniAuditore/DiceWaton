// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HostView } from '../routes/HostView';
import { useGameStore } from '../stores/useGameStore';
import { supabase } from '../lib/supabase';


vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInAnonymously: vi.fn(),
      getUser: vi.fn(),
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
  }
}));

describe('Supabase integration lifecycle in HostView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().reset();
    
    // Mock basic auth
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    (supabase.auth.signInAnonymously as any).mockResolvedValue({ data: { user: { id: 'anon-1' } } });
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'host-123' } } });
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

    const { unmount } = render(<HostView />);

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
    render(<HostView />);

    await waitFor(() => {
      expect(supabase.auth.signInAnonymously).toHaveBeenCalled();
    });

    expect(screen.getByText('Host a Game')).toBeTruthy();
    expect(screen.queryByText('Sign in to your account')).toBeNull();
  });
});
