import { LEGACY_CHECKLIST_STATUS_TO_TASK_STATUS } from "@construction-planner/shared/schemas";
import type { ChecklistItem, Project, SyncPullResponse, SyncPushBody, Task, TaskStatus, User } from "@construction-planner/shared/types";
import { api } from "@/shared/http";
import { getDatabase } from "@/services/databaseService";
import { useTaskStore } from "@/store/useTaskStore";
import { useSyncStatusStore } from "@/store/useSyncStatusStore";
import { checkpointStore } from "./checkpoints";

let syncing = false;
let intervalId: number | null = null;
let retryDelay = 1000;

const lwwMerge = async <T extends { id: string; updatedAt: number }>(
  docs: T[],
  upsert: (doc: T) => Promise<unknown>,
  getById: (id: string) => Promise<T | null>
) => {
  for (const doc of docs) {
    const existing = await getById(doc.id);
    if (!existing || doc.updatedAt >= existing.updatedAt) {
      await upsert(doc);
    }
  }
};

const collectPushPayload = async (userId: string, lastPushAt: number): Promise<SyncPushBody> => {
  const db = await getDatabase();
  const [users, projects, tasks, checklistItems] = await Promise.all([
    db.users.find({ selector: { userId, updatedAt: { $gt: lastPushAt } } }).exec(),
    db.projects.find({ selector: { userId, updatedAt: { $gt: lastPushAt } } }).exec(),
    db.tasks.find({ selector: { userId, updatedAt: { $gt: lastPushAt } } }).exec(),
    db.checklistItems.find({ selector: { userId, updatedAt: { $gt: lastPushAt } } }).exec()
  ]);

  return { users, projects, tasks, checklistItems, lastPushAt };
};

const normalizeChecklistItem = (doc: ChecklistItem): ChecklistItem => {
  const raw = doc.status as string;
  const mapped = LEGACY_CHECKLIST_STATUS_TO_TASK_STATUS[raw];
  const next: TaskStatus = (mapped ?? raw) as TaskStatus;
  if (next === doc.status) return doc;
  return { ...doc, status: next };
};

const mergePulledData = async (payload: SyncPullResponse) => {
  const db = await getDatabase();

  await lwwMerge<User>(payload.users, (doc) => db.users.upsert(doc), (id) => db.users.findOne(id).exec());
  await lwwMerge<Project>(payload.projects, (doc) => db.projects.upsert(doc), (id) => db.projects.findOne(id).exec());
  await lwwMerge<Task>(payload.tasks, (doc) => db.tasks.upsert(doc), (id) => db.tasks.findOne(id).exec());
  await lwwMerge<ChecklistItem>(
    payload.checklistItems.map(normalizeChecklistItem),
    (doc) => db.checklistItems.upsert(doc),
    (id) => db.checklistItems.findOne(id).exec()
  );
};

export const runSyncOnce = async () => {
  if (syncing) return;
  if (!navigator.onLine) return;
  const userId = useTaskStore.getState().userId;
  if (!userId) return;

  syncing = true;
  useSyncStatusStore.getState().setSyncing(true);
  const checkpoint = checkpointStore.get();

  try {
    const pushBody = await collectPushPayload(userId, checkpoint.lastPushAt);
    const pushResponse = await api.post<{ serverTime: number }>("/sync/push", pushBody);
    checkpoint.lastPushAt = pushResponse.serverTime;
    checkpointStore.set(checkpoint);

    const pullResponse = await api.get<SyncPullResponse>(`/sync/pull?userId=${userId}&since=${checkpoint.lastPullAt}`);
    await mergePulledData(pullResponse);
    checkpoint.lastPullAt = pullResponse.serverTime;
    checkpointStore.set(checkpoint);
    retryDelay = 1000;
    useSyncStatusStore.getState().markSuccess();
  } catch (error) {
    window.setTimeout(() => {
      runSyncOnce().catch(() => undefined);
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 15000);
    const message = error instanceof Error ? error.message : "Sync failed";
    useSyncStatusStore.getState().markError(message);
    console.error("Sync failed", error);
  } finally {
    syncing = false;
    useSyncStatusStore.getState().setSyncing(false);
  }
};

export const startSyncLoop = () => {
  runSyncOnce().catch(() => undefined);

  if (!intervalId) {
    intervalId = window.setInterval(() => {
      runSyncOnce().catch(() => undefined);
    }, 10_000);
  }

  const onReconnect = () => {
    runSyncOnce().catch(() => undefined);
  };

  window.addEventListener("online", onReconnect);

  return () => {
    window.removeEventListener("online", onReconnect);
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };
};
