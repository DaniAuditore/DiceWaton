import { create } from 'zustand';

export type UiStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'offline';

export type ScopedUiStatus = {
  status: UiStatus;
  message?: string;
};

type UiStore = {
  statusByScope: Record<string, UiStatus>;
  messageByScope: Record<string, string>;
  setStatus: (scope: string, status: UiStatus, message?: string) => void;
  clearStatus: (scope: string) => void;
  getScopedStatus: (scope: string) => ScopedUiStatus | null;
};

export const useUiStore = create<UiStore>((set, get) => ({
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
      const restStatus = { ...state.statusByScope };
      const restMessage = { ...state.messageByScope };
      delete restStatus[scope];
      delete restMessage[scope];
      return {
        statusByScope: restStatus,
        messageByScope: restMessage,
      };
    });
  },
  getScopedStatus: (scope) => {
    const status = get().statusByScope[scope];

    if (!status || status === 'idle') {
      return null;
    }

    return {
      status,
      message: get().messageByScope[scope],
    };
  },
}));

export const selectScopedStatus = (scope: string) => (state: UiStore) => {
  const status = state.statusByScope[scope];

  if (!status || status === 'idle') {
    return null;
  }

  return {
    status,
    message: state.messageByScope[scope],
  } satisfies ScopedUiStatus;
};
