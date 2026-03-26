import { z } from "zod";
import { baseEntitySchema } from "./base.schema";

export const projectSchema = baseEntitySchema.extend({
  name: z.string(),
  hasImage: z.boolean().default(false),
  imageUpdatedAt: z.number().optional(),
  /**
   * Timestamp of the last plan image upload that was confirmed on the server.
   * Used by clients to detect pending local uploads when offline.
   */
  imageSyncedAt: z.number().default(0),
});
