import { z } from "zod";

export const taskStatusSchema = z.enum([
  "NO_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "AWAITING_CHECK",
  "DONE",
]);

/** Map legacy persisted checklist status values to TaskStatus **/
export const LEGACY_CHECKLIST_STATUS_TO_TASK_STATUS: Record<
  string,
  z.infer<typeof taskStatusSchema>
> = {
  not_started: "NO_STARTED",
  in_progress: "IN_PROGRESS",
  blocked: "BLOCKED",
  final_check: "AWAITING_CHECK",
  done: "DONE",
};
