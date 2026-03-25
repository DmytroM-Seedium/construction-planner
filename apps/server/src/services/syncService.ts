import type {
  ChecklistItem,
  Project,
  SyncPullResponse,
  SyncPushBody,
  Task,
  User
} from "@construction-planner/shared/types";
import type { RepoBundle } from "../repositories/index.js";

const lww = <T extends { updatedAt: number }>(incoming: T, current: T | null): T | null => {
  if (!current) return incoming;
  if (incoming.updatedAt >= current.updatedAt) return incoming;
  return null;
};

export class SyncService {
  constructor(private readonly repos: RepoBundle) {}

  async push(body: SyncPushBody): Promise<{ serverTime: number }> {
    await this.upsertBatch(this.repos.users, body.users);
    await this.upsertBatch(this.repos.projects, body.projects);
    await this.upsertBatch(this.repos.tasks, body.tasks);
    await this.upsertBatch(this.repos.checklistItems, body.checklistItems);
    return { serverTime: Date.now() };
  }

  async pull(userId: string, since: number): Promise<SyncPullResponse> {
    const users = await this.repos.users.findUpdatedAfter(userId, since);
    const projects = await this.repos.projects.findUpdatedAfter(userId, since);
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
