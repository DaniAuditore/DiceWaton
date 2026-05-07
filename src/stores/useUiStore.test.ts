import { describe, expect, it } from 'vitest';
import { useUiStore } from './useUiStore';

describe('useUiStore', () => {
  it('sets and clears status by scope', () => {
    useUiStore.setState({ statusByScope: {}, messageByScope: {} });

    useUiStore.getState().setStatus('host-room', 'loading', 'Creando sala');
    expect(useUiStore.getState().statusByScope['host-room']).toBe('loading');
    expect(useUiStore.getState().messageByScope['host-room']).toBe('Creando sala');

    useUiStore.getState().clearStatus('host-room');
    expect(useUiStore.getState().statusByScope['host-room']).toBeUndefined();
    expect(useUiStore.getState().messageByScope['host-room']).toBeUndefined();
  });
});
