import {
  LEGACY_CHECKLIST_STATUS_TO_TASK_STATUS,
  LEGACY_SYNC_PLACEHOLDER,
} from "@construction-planner/shared/schemas";
import type { AuthResponse, ChecklistItem, Project, SyncPullResponse, SyncPushBody, Task, TaskStatus, User } from "@construction-planner/shared/types";
import { authUserToRecord } from "@/features/auth/mapAuthUser";
import { userRepository } from "@/entities/repositories/userRepository";
import { projectImageService } from "@/features/project-image/projectImageService";
import { api, HttpError } from "@/shared/http";
import { getDatabase } from "@/services/databaseService";
import { useTaskStore } from "@/store/useTaskStore";
import { useSyncStatusStore } from "@/store/useSyncStatusStore";
import { checkpointStore } from "./checkpoints";
import { remapLocalUserIdToServer } from "./userIdRemap";

let syncing = false;
let debounceTimer: number | null = null;
const DEBOUNCE_MS = 300;

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

const normalizePulledTask = (doc: Task): Task => {
  let title = doc.title?.trim() ?? "";
  let description = doc.description?.trim() ?? "";
  if (!title) title = LEGACY_SYNC_PLACEHOLDER;
  if (!description) description = LEGACY_SYNC_PLACEHOLDER;
  if (title === doc.title && description === doc.description) return doc;
  return { ...doc, title, description };
};

const normalizeChecklistItem = (doc: ChecklistItem): ChecklistItem => {
  const raw = doc.status as string;
  const mapped = LEGACY_CHECKLIST_STATUS_TO_TASK_STATUS[raw];
  const nextStatus: TaskStatus = (mapped ?? raw) as TaskStatus;
  let title = doc.title?.trim() ?? "";
  const description = doc.description?.trim() ?? "";
  if (!title) title = LEGACY_SYNC_PLACEHOLDER;
  const statusChanged = nextStatus !== doc.status;
  const stringsChanged = title !== doc.title || description !== doc.description;
  if (!statusChanged && !stringsChanged) return doc;
  return { ...doc, status: nextStatus, title, description };
};

const mergePulledData = async (payload: SyncPullResponse) => {
  const db = await getDatabase();

  await lwwMerge<User>(payload.users, (doc) => db.users.upsert(doc), (id) => db.users.findOne(id).exec());
  await lwwMerge<Project>(payload.projects, (doc) => db.projects.upsert(doc), (id) => db.projects.findOne(id).exec());
  await lwwMerge<Task>(
    payload.tasks.map(normalizePulledTask),
    (doc) => db.tasks.upsert(doc),
    (id) => db.tasks.findOne(id).exec(),
  );
  await lwwMerge<ChecklistItem>(
    payload.checklistItems.map(normalizeChecklistItem),
    (doc) => db.checklistItems.upsert(doc),
    (id) => db.checklistItems.findOne(id).exec()
  );
};

async function resolveUserNameForReauth(): Promise<string | null> {
  const { userName, userId } = useTaskStore.getState();
  const trimmed = userName?.trim();
  if (trimmed) return trimmed;
  if (!userId) return null;
  const u = await userRepository.findById(userId);
  return u?.name?.trim() ?? null;
}

/** POST /auth/login, remap ids if needed, session + checkpoint reset. Returns false if re-auth cannot run. */
async function silentReauthAfterUnauthorized(): Promise<boolean> {
  const localUserId = useTaskStore.getState().userId;
  if (!localUserId) return false;

  const name = await resolveUserNameForReauth();
  if (!name) {
    console.error("Silent re-auth: no user name available");
    return false;
  }

  const response = await api.post<AuthResponse>("/auth/login", { name });
  const serverUser = authUserToRecord(response.user);

  if (localUserId !== serverUser.id) {
    await remapLocalUserIdToServer(localUserId, serverUser);
  } else {
    await userRepository.upsertUser(serverUser);
  }

  useTaskStore.getState().setSession(response.token, response.user.id, response.user.name);
  checkpointStore.set({ lastPullAt: 0, lastPushAt: 0 });
  return true;
}

const runPushPull = async (userId: string) => {
  const checkpoint = checkpointStore.get();

  const pushBody = await collectPushPayload(userId, checkpoint.lastPushAt);
  const pushResponse = await api.post<{ serverTime: number }>("/sync/push", pushBody);
  checkpoint.lastPushAt = pushResponse.serverTime;
  checkpointStore.set(checkpoint);

  const pullResponse = await api.get<SyncPullResponse>(
    `/sync/pull?userId=${userId}&since=${checkpoint.lastPullAt}`
  );
  await mergePulledData(pullResponse);
  checkpoint.lastPullAt = pullResponse.serverTime;
  checkpointStore.set(checkpoint);
  useSyncStatusStore.getState().markSuccess();
};

const uploadPendingPlanImages = async (userId: string): Promise<void> => {
  const db = await getDatabase();
  const docs = await db.projects
    .find({
      selector: {
        userId,
        isDeleted: { $ne: true },
        hasImage: true,
        imageUpdatedAt: { $gt: 0 },
      },
    })
    .exec();

  for (const doc of docs) {
    const project = doc.toMutableJSON() as Project;
    const imageUpdatedAt: number | undefined =
      typeof project.imageUpdatedAt === "number" ? project.imageUpdatedAt : undefined;
    const imageSyncedAt: number =
      typeof project.imageSyncedAt === "number" ? project.imageSyncedAt : 0;

    if (!imageUpdatedAt) continue;
    if (imageUpdatedAt <= imageSyncedAt) continue;

    await projectImageService.uploadPendingFromLocal(project.id as string);
  }
};

export const runSyncOnce = async () => {
  if (syncing) return;
  let userId = useTaskStore.getState().userId;
  if (!userId) return;

  syncing = true;
  useSyncStatusStore.getState().setSyncing(true);

  let reauthAttempted = false;

  try {
    while (true) {
      userId = useTaskStore.getState().userId;
      if (!userId) return;

      try {
        await runPushPull(userId);
        try {
          await uploadPendingPlanImages(userId);
        } catch (postSyncErr) {
          const isNetworkError =
            postSyncErr instanceof TypeError ||
            (postSyncErr instanceof Error &&
              /failed to fetch|networkerror|load failed/i.test(postSyncErr.message));
          if (isNetworkError) {
            useSyncStatusStore.getState().setServerReachable(false);
          }
          console.error("Post-sync plan image upload failed", postSyncErr);
        }
        return;
      } catch (error) {
        if (error instanceof HttpError && error.status === 401 && !reauthAttempted) {
          reauthAttempted = true;
          try {
            const recovered = await silentReauthAfterUnauthorized();
            if (recovered) {
              continue;
            }
            useSyncStatusStore.getState().markError(
              "Sync unauthorized: sign in again or ensure your name is stored locally.",
            );
            return;
          } catch (reauthErr) {
            const message =
              reauthErr instanceof Error ? reauthErr.message : "Re-authentication failed";
            useSyncStatusStore.getState().markError(message);
            console.error("Silent re-auth failed", reauthErr);
            return;
          }
        }

        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message));
        if (isNetworkError) {
          useSyncStatusStore.getState().setServerReachable(false);
        }
        const message = error instanceof Error ? error.message : "Sync failed";
        useSyncStatusStore.getState().markError(message);
        console.error("Sync failed", error);
        return;
      }
    }
  } finally {
    syncing = false;
    useSyncStatusStore.getState().setSyncing(false);
  }
};

/** Debounced sync after local entity writes. */
export const requestSync = () => {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    runSyncOnce().catch(() => undefined);
  }, DEBOUNCE_MS);
};

export const subscribeSyncConnection = () => {
  const onOnline = () => {
    runSyncOnce().catch(() => undefined);
  };
  window.addEventListener("online", onOnline);
  return () => {
    window.removeEventListener("online", onOnline);
  };
};
