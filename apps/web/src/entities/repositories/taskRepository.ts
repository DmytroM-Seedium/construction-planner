import { nanoid } from "nanoid";
import type { RxQuery } from "rxdb";
import type { Task } from "@construction-planner/shared/types";
import { toPlain } from "@/lib/rxDocPlain";
import { requestSync } from "@/processes/sync/syncEngine";
import { getDatabase } from "@/services/databaseService";
import { createDefaultChecklistTemplates } from "@/shared/constants/defaultChecklistTemplates";
import { checklistRepository } from "@/entities/repositories/checklistRepository";

const now = () => Date.now();

const tasksQuery = async (
  userId: string,
  projectId: string,
): Promise<RxQuery<Task>> => {
  const db = await getDatabase();
  return db.tasks.find({
    selector: {
      userId,
      projectId,
      isDeleted: { $ne: true },
    },
    sort: [{ updatedAt: "desc" }],
  });
};

const cacheKey = (userId: string, projectId: string) =>
  `${userId}:${projectId}`;

function trimNonEmpty(value: string): string | null {
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export class TaskRepository {
  private readonly taskListCache = new Map<string, Task[]>();
  private static readonly EMPTY: Task[] = [];

  getTasksSnapshot(userId: string, projectId: string): Task[] {
    return this.taskListCache.get(cacheKey(userId, projectId)) ?? TaskRepository.EMPTY;
  }

  async upsertTask(task: Task): Promise<void> {
    const title = trimNonEmpty(task.title);
    const description = trimNonEmpty(task.description);
    if (!title || !description) {
      console.warn("taskRepository.upsertTask: skipped empty title or description", task.id);
      return;
    }
    const db = await getDatabase();
    await db.tasks.upsert({ ...task, title, description });
    requestSync();
  }

  async createTask(
    data: Omit<Task, "id" | "createdAt" | "updatedAt" | "isDeleted">,
  ): Promise<Task> {
    const title = trimNonEmpty(data.title);
    const description = trimNonEmpty(data.description);
    if (!title || !description) {
      throw new Error("Task title and description must be non-empty");
    }
    const timestamp = now();
    const task: Task = {
      ...data,
      title,
      description,
      id: nanoid(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    };
    await this.upsertTask(task);
    for (const template of createDefaultChecklistTemplates()) {
      await checklistRepository.createChecklistItem({
        userId: data.userId,
        taskId: task.id,
        title: template.title,
        description: template.description,
        status: template.status,
      });
    }
    return task;
  }

  async softDeleteTask(userId: string, taskId: string): Promise<void> {
    await checklistRepository.softDeleteChecklistItemsForTask(userId, taskId);
    const db = await getDatabase();
    const doc = await db.tasks.findOne(taskId).exec();
    if (!doc) return;
    const task = doc.toMutableJSON() as Task;
    if (task.userId !== userId) return;
    await this.upsertTask({
      ...task,
      isDeleted: true,
      updatedAt: now(),
    });
  }

  /**
   * Subscribe to task list changes for a project. Calls `listener` with the latest rows.
   * Returns an unsubscribe function.
   */
  subscribeToTasks(
    userId: string,
    projectId: string,
    listener: (tasks: Task[]) => void,
  ): () => void {
    const key = cacheKey(userId, projectId);
    let cancelled = false;
    let unsubscribeRx = () => {};

    tasksQuery(userId, projectId).then((query) => {
      if (cancelled) return;
      const sub = query.$.subscribe((result) => {
        const docs: unknown[] = Array.isArray(result) ? (result as unknown[]) : [];
        const tasks = docs.map((d) => toPlain<Task>(d));
        this.taskListCache.set(key, tasks);
        listener(tasks);
      });
      unsubscribeRx = () => sub.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribeRx();
      this.taskListCache.delete(key);
    };
  }
}

export const taskRepository = new TaskRepository();
