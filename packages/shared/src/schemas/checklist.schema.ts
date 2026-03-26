import { z } from "zod";
import { baseEntitySchema } from "./base.schema";
import { taskStatusSchema } from "./enums/task-status.schema";
import { nonEmptyTrimmedString, trimmedString } from "./stringRefine.schema";

export const checklistItemSchema = baseEntitySchema.extend({
  taskId: z.string(),
  title: nonEmptyTrimmedString,
  description: trimmedString,
  status: taskStatusSchema
});
