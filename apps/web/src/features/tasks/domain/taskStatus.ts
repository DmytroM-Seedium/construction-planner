import { taskStatusSchema } from "@construction-planner/shared/schemas";
import type { TaskStatus } from "@construction-planner/shared/types";

export const TASK_STATUSES = taskStatusSchema.options;

export const TASK_STATUS = {
  NO_STARTED: "NO_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  BLOCKED: "BLOCKED",
  AWAITING_CHECK: "AWAITING_CHECK",
  DONE: "DONE",
} as const satisfies Record<TaskStatus, TaskStatus>;

