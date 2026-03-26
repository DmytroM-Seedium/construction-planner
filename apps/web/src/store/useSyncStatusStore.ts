import { create } from "zustand";

export type SyncStatusState = {
  isSyncing: boolean;
  lastSuccessAt: number | null;
  lastError: string | null;
  serverReachable: boolean | null;
  setSyncing: (value: boolean) => void;
  markSuccess: () => void;
  markError: (message: string) => void;
  setServerReachable: (value: boolean | null) => void;
};

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  isSyncing: false,
  lastSuccessAt: null,
  lastError: null,
  serverReachable: null,
  setSyncing: (isSyncing) => set({ isSyncing }),
  markSuccess: () => set({ lastSuccessAt: Date.now(), lastError: null, serverReachable: true }),
  markError: (message: string) => set({ lastError: message }),
  setServerReachable: (serverReachable) => set({ serverReachable })
}));
