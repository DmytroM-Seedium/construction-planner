import { z } from "zod";
import { baseEntitySchema } from "./base.schema";

export const projectSchema = baseEntitySchema.extend({
  name: z.string(),
  hasImage: z.boolean().default(false),
  imageUpdatedAt: z.number().optional()
});
