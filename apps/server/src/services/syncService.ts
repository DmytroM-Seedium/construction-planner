import type {
  ChecklistItem,
  Project,
  SyncPullResponse,
  SyncPushBody,
  Task,
  User
} from "@construction-planner/shared/types";
import { projectSchema } from "@construction-planner/shared/schemas";
import type { RepoBundle } from "../repositories/index.js";

const lww = <T extends { updatedAt: number }>(incoming: T, current: T | null): T | null => {
  if (!current) return incoming;
  if (incoming.updatedAt >= current.updatedAt) return incoming;
  return null;
};

const normalizeProject = (doc: Project): Project => {
  const anyDoc = doc as any;
  const hasImage = typeof anyDoc?.hasImage === "boolean" ? anyDoc.hasImage : false;
  const imageUpdatedAt =
    typeof anyDoc?.imageUpdatedAt === "number" && Number.isFinite(anyDoc.imageUpdatedAt)
      ? anyDoc.imageUpdatedAt
      : undefined;

  // `imageSyncedAt` is required by the client RxDB schema. Legacy server DB rows can miss it.
  if (typeof anyDoc?.imageSyncedAt !== "number" || !Number.isFinite(anyDoc.imageSyncedAt)) {
    return {
      ...(doc as any),
      imageSyncedAt: hasImage && typeof imageUpdatedAt === "number" ? imageUpdatedAt : 0,
    } as Project;
  }
  return doc;
};

export class SyncService {
  constructor(private readonly repos: RepoBundle) {}

  async push(body: SyncPushBody): Promise<{ serverTime: number }> {
    await this.upsertBatch(this.repos.users, body.users);
    // Normalize for legacy clients/rows and apply schema defaults.
    const projects = body.projects.map(normalizeProject).map((p) => projectSchema.parse(p));
    await this.upsertBatch(this.repos.projects, projects);
    await this.upsertBatch(this.repos.tasks, body.tasks);
    await this.upsertBatch(this.repos.checklistItems, body.checklistItems);
    return { serverTime: Date.now() };
  }

  async pull(userId: string, since: number): Promise<SyncPullResponse> {
    const users = await this.repos.users.findUpdatedAfter(userId, since);
    const rawProjects = await this.repos.projects.findUpdatedAfter(userId, since);
    const projects = rawProjects
      .map(normalizeProject)
      // Apply defaults (e.g. `imageSyncedAt`) consistently at the boundary.
      .map((p) => projectSchema.parse(p));
    const tasks = await this.repos.tasks.findUpdatedAfter(userId, since);
    const checklistItems = await this.repos.checklistItems.findUpdatedAfter(userId, since);

    return {
      users,
      projects,
      tasks,
      checklistItems,
      serverTime: Date.now()
    };
  }

  private async upsertBatch<T extends { id: string; updatedAt: number; userId: string }>(
    repo: { findById(id: string): Promise<T | null>; upsert(item: T): Promise<void> },
    docs: T[]
  ): Promise<void> {
    for (const doc of docs) {
      const current = await repo.findById(doc.id);
      const winner = lww(doc, current);
      if (winner) {
        await repo.upsert(winner);
      }
    }
  }
}

export type SyncPayload = {
  users: User[];
  projects: Project[];
  tasks: Task[];
  checklistItems: ChecklistItem[];
};
