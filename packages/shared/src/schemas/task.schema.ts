import { z } from "zod";
import { baseEntitySchema } from "./base.schema";
import { nonEmptyTrimmedString } from "./stringRefine.schema";

export const taskSchema = baseEntitySchema.extend({
  projectId: z.string(),
  title: nonEmptyTrimmedString,
  description: nonEmptyTrimmedString,
  x: z.number(),
  y: z.number()
});
