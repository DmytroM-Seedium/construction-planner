import type { ChecklistItem, TaskStatus } from "@construction-planner/shared/types";

export function deriveTaskStatus(items: ChecklistItem[]): TaskStatus {
  if (items.length === 0) return "NO_STARTED";

  const statuses = items.map((i) => i.status);
  const all = (s: TaskStatus) => statuses.every((x) => x === s);
  const any = (s: TaskStatus) => statuses.some((x) => x === s);

  if (any("BLOCKED")) return "BLOCKED";
  if (any("AWAITING_CHECK")) return "AWAITING_CHECK";
  if (all("DONE")) return "DONE";
  if (all("NO_STARTED")) return "NO_STARTED";
  return "IN_PROGRESS";
}

