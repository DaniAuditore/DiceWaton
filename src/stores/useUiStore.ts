import { create } from 'zustand';

export type UiStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'offline';

type UiStore = {
  statusByScope: Record<string, UiStatus>;
  messageByScope: Record<string, string>;
  setStatus: (scope: string, status: UiStatus, message?: string) => void;
  clearStatus: (scope: string) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  statusByScope: {},
  messageByScope: {},
  setStatus: (scope, status, message) => {
    set((state) => ({
      statusByScope: {
        ...state.statusByScope,
        [scope]: status,
      },
      messageByScope:
        message === undefined
          ? state.messageByScope
          : {
              ...state.messageByScope,
              [scope]: message,
            },
    }));
  },
  clearStatus: (scope) => {
    set((state) => {
      const { [scope]: _, ...restStatus } = state.statusByScope;
      const { [scope]: __, ...restMessage } = state.messageByScope;
      return {
        statusByScope: restStatus,
        messageByScope: restMessage,
      };
    });
  },
}));
