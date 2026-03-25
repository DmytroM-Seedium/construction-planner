import { z } from "zod";
import { syncPullQuerySchema, syncPullResponseSchema, syncPushBodySchema } from "../sync/sync.schema";

export type SyncPushBody = z.infer<typeof syncPushBodySchema>;
export type SyncPullQuery = z.infer<typeof syncPullQuerySchema>;
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;

export type SyncCheckpoint = {
  lastPushAt: number;
  lastPullAt: number;
};
