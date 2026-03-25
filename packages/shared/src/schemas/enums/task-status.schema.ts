import { z } from "zod";

/** Checklist line / task workflow status (persisted as these string literals). */
export const taskStatusSchema = z.enum([
  "NO_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "AWAITING_CHECK",
  "DONE"
]);

/** Map legacy persisted checklist status values to TaskStatus (one-time migration). */
export const LEGACY_CHECKLIST_STATUS_TO_TASK_STATUS: Record<string, z.infer<typeof taskStatusSchema>> = {
  not_started: "NO_STARTED",
  in_progress: "IN_PROGRESS",
  blocked: "BLOCKED",
  final_check: "AWAITING_CHECK",
  done: "DONE"
};
