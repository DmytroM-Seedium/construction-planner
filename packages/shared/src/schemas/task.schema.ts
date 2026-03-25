import { z } from "zod";
import { baseEntitySchema } from "./base.schema";

export const taskSchema = baseEntitySchema.extend({
  projectId: z.string(),
  title: z.string(),
  x: z.number(),
  y: z.number()
});
