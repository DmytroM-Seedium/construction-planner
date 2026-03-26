import type {
  ChecklistItem,
  Project,
  SyncPullResponse,
  SyncPushBody,
  Task,
  User
} from "@construction-planner/shared/types";
import { LEGACY_SYNC_PLACEHOLDER, projectSchema } from "@construction-planner/shared/schemas";
import type { RepoBundle } from "../repositories/index.js";

const lww = <T extends { updatedAt: number }>(incoming: T, current: T | null): T | null => {
  if (!current) return incoming;
  if (incoming.updatedAt >= current.updatedAt) return incoming;
  return null;
};

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const normalizeProject = (doc: Project): Project => {
  const r = record(doc);
  const hasImage = typeof r.hasImage === "boolean" ? r.hasImage : false;
  const imageUpdatedAt =
    typeof r.imageUpdatedAt === "number" && Number.isFinite(r.imageUpdatedAt)
      ? (r.imageUpdatedAt as number)
      : undefined;

  // `imageSyncedAt` is required by the client RxDB schema. Legacy server DB rows can miss it.
  if (typeof r.imageSyncedAt !== "number" || !Number.isFinite(r.imageSyncedAt)) {
    return {
      ...doc,
      imageSyncedAt: hasImage && typeof imageUpdatedAt === "number" ? imageUpdatedAt : 0,
    };
  }
  return doc;
};

const normalizeTask = (doc: Task): Task => {
  const r = record(doc);
  let title = typeof r.title === "string" ? r.title.trim() : "";
  let description = typeof r.description === "string" ? r.description.trim() : "";
  if (!title) title = LEGACY_SYNC_PLACEHOLDER;
  if (!description) description = LEGACY_SYNC_PLACEHOLDER;
  if (title === doc.title && description === doc.description) return doc;
  return { ...doc, title, description };
};

const normalizeChecklistItem = (doc: ChecklistItem): ChecklistItem => {
  const r = record(doc);
  let title = typeof r.title === "string" ? r.title.trim() : "";
  const description = typeof r.description === "string" ? r.description.trim() : "";
  if (!title) title = LEGACY_SYNC_PLACEHOLDER;
  if (title === doc.title && description === doc.description) return doc;
  return { ...doc, title, description };
};

export class SyncService {
  constructor(private readonly repos: RepoBundle) {}

  async push(body: SyncPushBody): Promise<{ serverTime: number }> {
    await this.upsertBatch(this.repos.users, body.users);
    // Normalize for legacy clients/rows and apply schema defaults.
    const projects = body.projects
      .map(normalizeProject)
      .map((p: Project) => projectSchema.parse(p));
    await this.upsertBatch(this.repos.projects, projects);
    await this.upsertBatch(this.repos.tasks, body.tasks.map(normalizeTask));
    await this.upsertBatch(
      this.repos.checklistItems,
      body.checklistItems.map(normalizeChecklistItem),
    );
    return { serverTime: Date.now() };
  }

  async pull(userId: string, since: number): Promise<SyncPullResponse> {
    const users = await this.repos.users.findUpdatedAfter(userId, since);
    const rawProjects = await this.repos.projects.findUpdatedAfter(userId, since);
    const projects = rawProjects
      .map(normalizeProject)
      // Apply defaults (e.g. `imageSyncedAt`) consistently at the boundary.
      .map((p: Project) => projectSchema.parse(p));
    const tasks = (await this.repos.tasks.findUpdatedAfter(userId, since)).map(normalizeTask);
    const checklistItems = (await this.repos.checklistItems.findUpdatedAfter(userId, since)).map(
      normalizeChecklistItem,
    );

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
