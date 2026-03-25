import { z } from "zod";
import { checklistItemSchema } from "../schemas/checklist.schema";
import { projectSchema } from "../schemas/project.schema";
import { taskSchema } from "../schemas/task.schema";
import { userSchema } from "../schemas/user.schema";

export const syncPushBodySchema = z.object({
  users: z.array(userSchema).default([]),
  projects: z.array(projectSchema).default([]),
  tasks: z.array(taskSchema).default([]),
  checklistItems: z.array(checklistItemSchema).default([]),
  lastPushAt: z.number().default(0)
});

export const syncPullQuerySchema = z.object({
  userId: z.string(),
  since: z.coerce.number().default(0)
});

export const syncPullResponseSchema = z.object({
  users: z.array(userSchema),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  checklistItems: z.array(checklistItemSchema),
  serverTime: z.number()
});
