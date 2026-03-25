import test from "node:test";
import assert from "node:assert/strict";
import type { BaseRepository } from "../repositories/baseRepository.js";
import { SyncService } from "../services/syncService.js";
import type {
  ChecklistItem,
  Project,
  Task,
  User,
} from "@construction-planner/shared/types";

const memoryRepo = <
  T extends { id: string; userId: string; updatedAt: number },
>(): BaseRepository<T> => {
  const data = new Map<string, T>();
  return {
    async upsert(item: T) {
      const existing = data.get(item.id);
      if (!existing || item.updatedAt >= existing.updatedAt) {
        data.set(item.id, item);
      }
    },
    async findById(id: string) {
      return data.get(id) ?? null;
    },
    async findUpdatedAfter(userId: string, since: number) {
      return Array.from(data.values()).filter(
        (item) => item.userId === userId && item.updatedAt > since,
      );
    },
    async upsertMany(items: T[]) {
      await Promise.all(items.map((item) => this.upsert(item)));
    },
    async findByUserId(userId: string) {
      return Array.from(data.values()).filter((item) => item.userId === userId);
    },
  } as BaseRepository<T>;
};

test("sync uses last-write-wins by updatedAt", async () => {
  const repos = {
    users: memoryRepo<User>(),
    projects: memoryRepo<Project>(),
    tasks: memoryRepo<Task>(),
    checklistItems: memoryRepo<ChecklistItem>(),
  };

  const service = new SyncService(repos);

  await service.push({
    lastPushAt: 0,
    users: [],
    projects: [
      {
        id: "p1",
        userId: "u1",
        name: "A",
        createdAt: 200,
        updatedAt: 200,
        isDeleted: false,
        hasImage: false,
      },
    ],
    tasks: [],
    checklistItems: [],
  });

  await service.push({
    lastPushAt: 0,
    users: [],
    projects: [
      {
        id: "p1",
        userId: "u1",
        name: "Old",
        createdAt: 100,
        updatedAt: 100,
        isDeleted: false,
        hasImage: false,
      },
    ],
    tasks: [],
    checklistItems: [],
  });

  const pull = await service.pull("u1", 0);
  assert.equal(pull.projects[0]?.name, "A");
});
