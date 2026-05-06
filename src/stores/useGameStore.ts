import { create } from 'zustand';

export type GameContext = 'COMBAT' | 'EXPLORATION' | 'IDLE';

interface GameState {
  // Identity
  playerId: string | null;
  isHost: boolean;
  
  // Room Info
  roomId: string | null;
  roomPin: string | null;
  
  // Game Context
  gameContext: GameContext;
  allowedActions: string[];
  
  // Actions
  setIdentity: (playerId: string, isHost: boolean) => void;
  setRoom: (roomId: string, pin: string) => void;
  updateGameState: (context: GameContext, actions: string[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerId: null,
  isHost: false,
  roomId: null,
  roomPin: null,
  gameContext: 'IDLE',
  allowedActions: [],

  setIdentity: (playerId, isHost) => set({ playerId, isHost }),
  
  setRoom: (roomId, roomPin) => set({ roomId, roomPin }),
  
  updateGameState: (gameContext, allowedActions) => 
    set({ gameContext, allowedActions }),
    
  reset: () => set({
    roomId: null,
    roomPin: null,
    gameContext: 'IDLE',
    allowedActions: []
  })
}));
