import { z } from "zod";
import { baseEntitySchema } from "./base.schema";
import { taskStatusSchema } from "./enums/task-status.schema";

export const checklistItemSchema = baseEntitySchema.extend({
  taskId: z.string(),
  title: z.string(),
  status: taskStatusSchema
});
