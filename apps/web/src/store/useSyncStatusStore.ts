import { create } from "zustand";

export type SyncStatusState = {
  isSyncing: boolean;
  lastSuccessAt: number | null;
  lastError: string | null;
  setSyncing: (value: boolean) => void;
  markSuccess: () => void;
  markError: (message: string) => void;
};

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  isSyncing: false,
  lastSuccessAt: null,
  lastError: null,
  setSyncing: (isSyncing) => set({ isSyncing }),
  markSuccess: () => set({ lastSuccessAt: Date.now(), lastError: null }),
  markError: (message: string) => set({ lastError: message })
}));
