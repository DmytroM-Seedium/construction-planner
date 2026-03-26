import type { ChecklistItem } from "@construction-planner/shared/types";
import { nanoid } from "nanoid";
import type { RxQuery } from "rxdb";
import { toPlain } from "@/core/infrastructure/rxdb/rxDocPlain";
import { requestSync } from "@/core/infrastructure/sync/syncEngine";
import { getDbClient } from "@/core/infrastructure/db-client";

const now = () => Date.now();

const checklistItemsByTaskQuery = async (
  userId: string,
  taskId: string,
): Promise<RxQuery<ChecklistItem>> => {
  const db = await getDbClient();
  return db.checklistItems.find({
    selector: { userId, taskId, isDeleted: { $ne: true } },
    sort: [{ updatedAt: "desc" }],
  });
};

const checklistItemsByTasksQuery = async (
  userId: string,
  taskIds: string[],
): Promise<RxQuery<ChecklistItem>> => {
  const db = await getDbClient();
  return db.checklistItems.find({
    selector: { userId, taskId: { $in: taskIds }, isDeleted: { $ne: true } },
    sort: [{ updatedAt: "desc" }],
  });
};

const byTaskKey = (userId: string, taskId: string) => `${userId}:${taskId}`;
const byTasksKey = (userId: string, taskIds: string[]) =>
  `${userId}:${[...taskIds].sort().join(",")}`;

function trimNonEmpty(value: string): string | null {
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function trimDescription(value: string | undefined): string {
  return (value ?? "").trim();
}

export class ChecklistRepository {
  private readonly checklistByTaskCache = new Map<string, ChecklistItem[]>();
  private readonly checklistByTasksCache = new Map<string, ChecklistItem[]>();
  /** Stable empty snapshot for `useSyncExternalStore` — never return a fresh `[]` from getters. */
  private static readonly EMPTY: ChecklistItem[] = [];

  async upsertChecklistItem(item: ChecklistItem): Promise<void> {
    const title = trimNonEmpty(item.title);
    const description = trimDescription(item.description);
    if (!title) {
      console.warn("checklistRepository.upsertChecklistItem: skipped empty title", item.id);
      return;
    }
    const db = await getDbClient();
    await db.checklistItems.upsert({ ...item, title, description });
    requestSync();
  }

  async softDeleteChecklistItemsForTask(userId: string, taskId: string): Promise<void> {
    const db = await getDbClient();
    const query = await db.checklistItems.find({
      selector: { userId, taskId, isDeleted: { $ne: true } },
    });
    const docs = await query.exec();
    const ts = now();
    for (const doc of docs) {
      const item = doc.toMutableJSON() as ChecklistItem;
      await db.checklistItems.upsert({
        ...item,
        isDeleted: true,
        updatedAt: ts,
      });
    }
    if (docs.length > 0) requestSync();
  }

  async createChecklistItem(
    data: Omit<ChecklistItem, "id" | "createdAt" | "updatedAt" | "isDeleted">,
  ): Promise<ChecklistItem> {
    const title = trimNonEmpty(data.title);
    const description = trimDescription(data.description);
    if (!title) {
      throw new Error("Checklist item name must be non-empty");
    }
    const timestamp = now();
    const item: ChecklistItem = {
      ...data,
      title,
      description,
      id: nanoid(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    };
    await this.upsertChecklistItem(item);
    return item;
  }

  getChecklistItemsByTaskSnapshot(userId: string, taskId: string): ChecklistItem[] {
    return this.checklistByTaskCache.get(byTaskKey(userId, taskId)) ?? ChecklistRepository.EMPTY;
  }

  getChecklistItemsByTasksSnapshot(userId: string, taskIds: string[]): ChecklistItem[] {
    if (taskIds.length === 0) return ChecklistRepository.EMPTY;
    return this.checklistByTasksCache.get(byTasksKey(userId, taskIds)) ?? ChecklistRepository.EMPTY;
  }

  subscribeToChecklistItemsByTask(
    userId: string,
    taskId: string,
    listener: (items: ChecklistItem[]) => void,
  ): () => void {
    const key = byTaskKey(userId, taskId);
    let cancelled = false;
    let unsubscribeRx = () => {};

    checklistItemsByTaskQuery(userId, taskId).then((query) => {
      if (cancelled) return;
      const sub = query.$.subscribe((result) => {
        const docs: unknown[] = Array.isArray(result) ? (result as unknown[]) : [];
        const items = docs.map((d) => toPlain<ChecklistItem>(d));
        this.checklistByTaskCache.set(key, items);
        listener(items);
      });
      unsubscribeRx = () => sub.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribeRx();
      this.checklistByTaskCache.delete(key);
    };
  }

  subscribeToChecklistItemsByTasks(
    userId: string,
    taskIds: string[],
    listener: (items: ChecklistItem[]) => void,
  ): () => void {
    if (taskIds.length === 0) {
      return () => {};
    }

    const key = byTasksKey(userId, taskIds);
    let cancelled = false;
    let unsubscribeRx = () => {};

    checklistItemsByTasksQuery(userId, taskIds).then((query) => {
      if (cancelled) return;
      const sub = query.$.subscribe((result) => {
        const docs: unknown[] = Array.isArray(result) ? (result as unknown[]) : [];
        const items = docs.map((d) => toPlain<ChecklistItem>(d));
        this.checklistByTasksCache.set(key, items);
        listener(items);
      });
      unsubscribeRx = () => sub.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribeRx();
      this.checklistByTasksCache.delete(key);
    };
  }
}

export const checklistRepository = new ChecklistRepository();

