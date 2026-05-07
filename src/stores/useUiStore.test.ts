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

  it('returns scoped status helper data only for active scopes', () => {
    useUiStore.setState({ statusByScope: {}, messageByScope: {} });

    expect(useUiStore.getState().getScopedStatus('room-pin')).toBeNull();

    useUiStore.getState().setStatus('room-pin', 'success', 'PIN copiado');

    expect(useUiStore.getState().getScopedStatus('room-pin')).toEqual({
      status: 'success',
      message: 'PIN copiado',
    });
  });
});
