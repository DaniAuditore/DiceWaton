import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const createFallbackStorage = () => {
  const memory = new Map<string, string>();
  return {
    getItem: (name: string) => memory.get(name) ?? null,
    setItem: (name: string, value: string) => {
      memory.set(name, value);
    },
    removeItem: (name: string) => {
      memory.delete(name);
    }
  };
};

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

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'dicewaton-game-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : createFallbackStorage())),
      partialize: (state) => ({
        playerId: state.playerId,
        isHost: state.isHost,
        roomId: state.roomId,
        roomPin: state.roomPin,
        gameContext: state.gameContext,
        allowedActions: state.allowedActions
      })
    }
  )
);
