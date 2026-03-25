import { z } from "zod";

export const baseEntitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  isDeleted: z.boolean().default(false),
});
