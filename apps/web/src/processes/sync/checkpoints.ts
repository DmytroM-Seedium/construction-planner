import type { SyncCheckpoint } from "@construction-planner/shared/types";

const KEY = "cp_sync_checkpoint";

export const checkpointStore = {
  get(): SyncCheckpoint {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { lastPullAt: 0, lastPushAt: 0 };
    try {
      return JSON.parse(raw) as SyncCheckpoint;
    } catch {
      return { lastPullAt: 0, lastPushAt: 0 };
    }
  },
  set(checkpoint: SyncCheckpoint) {
    localStorage.setItem(KEY, JSON.stringify(checkpoint));
  }
};
