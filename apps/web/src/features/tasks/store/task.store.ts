import { create } from "zustand";
import type { ChecklistItem, Task, TaskStatus } from "@construction-planner/shared/types";
import { taskRepository } from "@/features/tasks/data/task.repository";
import { checklistRepository } from "@/features/tasks/data/checklist.repository";
import { deriveTaskStatus } from "@/features/tasks/deriveTaskStatus";

type Key = string;
const key = (userId: string, projectId: string) => `${userId}:${projectId}` satisfies Key;

export type TaskFacadeState = {
  tasksByProject: Record<Key, Task[]>;
  derivedStatusByTaskId: Record<string, TaskStatus>;
  setProjectTasksSnapshot: (userId: string, projectId: string, tasks: Task[]) => void;
  recomputeDerivedStatuses: (items: ChecklistItem[]) => void;
  createTask: (args: {
    userId: string;
    projectId: string;
    title: string;
    description: string;
    x: number;
    y: number;
  }) => Promise<Task>;
  upsertTask: (task: Task) => Promise<void>;
  softDeleteTask: (userId: string, taskId: string) => Promise<void>;
  upsertChecklistItem: (item: ChecklistItem) => Promise<void>;
  createChecklistItem: (
    data: Omit<ChecklistItem, "id" | "createdAt" | "updatedAt" | "isDeleted">,
  ) => Promise<ChecklistItem>;
  softDeleteChecklistItemsForTask: (userId: string, taskId: string) => Promise<void>;
};

export const useTaskFacadeStore = create<TaskFacadeState>((set, get) => ({
  tasksByProject: {},
  derivedStatusByTaskId: {},
  setProjectTasksSnapshot: (userId, projectId, tasks) =>
    set((s) => ({
      tasksByProject: { ...s.tasksByProject, [key(userId, projectId)]: tasks },
    })),
  recomputeDerivedStatuses: (items) => {
    const byTask: Record<string, ChecklistItem[]> = {};
    for (const item of items) (byTask[item.taskId] ??= []).push(item);
    const next: Record<string, TaskStatus> = {};
    for (const [taskId, list] of Object.entries(byTask)) {
      next[taskId] = deriveTaskStatus(list);
    }
    set({ derivedStatusByTaskId: next });
  },
  createTask: async (args) =>
    taskRepository.createTask({
      userId: args.userId,
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      x: args.x,
      y: args.y,
    }),
  upsertTask: async (task) => taskRepository.upsertTask(task),
  softDeleteTask: async (userId, taskId) => taskRepository.softDeleteTask(userId, taskId),
  upsertChecklistItem: async (item) => checklistRepository.upsertChecklistItem(item),
  createChecklistItem: async (data) => checklistRepository.createChecklistItem(data),
  softDeleteChecklistItemsForTask: async (userId, taskId) =>
    checklistRepository.softDeleteChecklistItemsForTask(userId, taskId),
}));

