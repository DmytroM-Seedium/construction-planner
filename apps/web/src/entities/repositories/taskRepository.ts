import { nanoid } from "nanoid";
import type { RxQuery } from "rxdb";
import type { Task } from "@construction-planner/shared/types";
import { getDatabase } from "@/services/databaseService";
import { createDefaultChecklistTemplates } from "@/features/checklist/checklistFactory";
import { localRepository } from "@/entities/repositories/localRepository";

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

export class TaskRepository {
  private readonly taskListCache = new Map<string, Task[]>();
  private static readonly EMPTY: Task[] = [];

  getTasksSnapshot(userId: string, projectId: string): Task[] {
    return this.taskListCache.get(cacheKey(userId, projectId)) ?? TaskRepository.EMPTY;
  }

  async upsertTask(task: Task): Promise<void> {
    const db = await getDatabase();
    await db.tasks.upsert(task);
  }

  async createTask(
    data: Omit<Task, "id" | "createdAt" | "updatedAt" | "isDeleted">,
  ): Promise<Task> {
    const timestamp = now();
    const task: Task = {
      ...data,
      id: nanoid(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    };
    await this.upsertTask(task);
    for (const template of createDefaultChecklistTemplates()) {
      await localRepository.createChecklistItem({
        userId: data.userId,
        taskId: task.id,
        title: template.title,
        status: template.status,
      });
    }
    return task;
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
        const tasks = (result ?? []) as Task[];
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
