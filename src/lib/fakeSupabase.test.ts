import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fakeSupabase';

class MockBroadcastChannel {
  private closed = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;

  constructor(public readonly name: string) {}

  postMessage() {
    if (this.closed) {
      throw new DOMException('Channel is closed', 'InvalidStateError');
    }
  }

  close() {
    this.closed = true;
  }
}

describe('fakeSupabase channel lifecycle', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel as unknown as typeof BroadcastChannel);
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('ignores late presence and broadcast writes after cleanup', async () => {
    const channel = fakeSupabase.channel('room:test', {
      config: { presence: { key: 'host' } },
    });

    await expect(channel.track({ id: 'host', name: 'Host' })).resolves.toBeUndefined();
    expect(channel.presenceState()).toEqual({ host: [{ id: 'host', name: 'Host' }] });

    fakeSupabase.removeChannel(channel);

    expect(() =>
      channel.send({ type: 'broadcast', event: 'dice_roll', payload: { value: 20 } }),
    ).not.toThrow();
    await expect(channel.track({ id: 'late', name: 'Late join' })).resolves.toBeUndefined();
  });
});
