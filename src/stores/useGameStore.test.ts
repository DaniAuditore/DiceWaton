import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../stores/useGameStore';

describe('useGameStore Reducers', () => {
  beforeEach(() => {
    // Reset state before each test
    useGameStore.getState().reset();
  });

  it('initializes with default state', () => {
    const state = useGameStore.getState();
    expect(state.playerId).toBeNull();
    expect(state.isHost).toBe(false);
    expect(state.roomId).toBeNull();
    expect(state.roomPin).toBeNull();
    expect(state.gameContext).toBe('IDLE');
    expect(state.allowedActions).toEqual([]);
  });

  it('setIdentity updates playerId and isHost', () => {
    useGameStore.getState().setIdentity('player123', true);
    
    const state = useGameStore.getState();
    expect(state.playerId).toBe('player123');
    expect(state.isHost).toBe(true);
  });

  it('setRoom updates roomId and roomPin', () => {
    useGameStore.getState().setRoom('room-abc-123', 'ABCD');
    
    const state = useGameStore.getState();
    expect(state.roomId).toBe('room-abc-123');
    expect(state.roomPin).toBe('ABCD');
  });

  it('updateGameState updates context and actions', () => {
    useGameStore.getState().updateGameState('COMBAT', ['ATTACK', 'DEFEND']);
    
    const state = useGameStore.getState();
    expect(state.gameContext).toBe('COMBAT');
    expect(state.allowedActions).toEqual(['ATTACK', 'DEFEND']);
  });

  it('reset clears all game state', () => {
    const store = useGameStore.getState();
    store.setIdentity('player123', true);
    store.setRoom('room1', 'XYZZ');
    store.updateGameState('EXPLORATION', ['SEARCH']);
    
    useGameStore.getState().reset();
    
    const state = useGameStore.getState();
    // Identity is NOT cleared by reset intentionally? 
    // Let's check the store implementation: reset only clears roomId, roomPin, gameContext, allowedActions
    expect(state.roomId).toBeNull();
    expect(state.roomPin).toBeNull();
    expect(state.gameContext).toBe('IDLE');
    expect(state.allowedActions).toEqual([]);
    
    // playerId and isHost should remain what they were because `reset()` doesn't touch them.
    expect(state.playerId).toBe('player123');
    expect(state.isHost).toBe(true);
  });
});
