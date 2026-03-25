import { z } from "zod";
import { checklistItemSchema } from "../schemas/checklist.schema";
import { taskStatusSchema } from "../schemas/enums/task-status.schema";
import { projectSchema } from "../schemas/project.schema";
import { taskSchema } from "../schemas/task.schema";
import { userSchema } from "../schemas/user.schema";

export type TaskStatus = z.infer<typeof taskStatusSchema>;
/** @deprecated Use TaskStatus */
export type ChecklistStatus = TaskStatus;
export type User = z.infer<typeof userSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Task = z.infer<typeof taskSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
