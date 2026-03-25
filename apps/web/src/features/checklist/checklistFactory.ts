import type { TaskStatus } from "@construction-planner/shared/types";

export type DefaultChecklistTemplate = { title: string; status: TaskStatus };

/** Placeholder default checklist rows for new tasks (replace with product copy later). */
export const createDefaultChecklistTemplates = (): readonly DefaultChecklistTemplate[] => [
  { title: "Site safety review", status: "NO_STARTED" },
  { title: "Materials confirmed", status: "NO_STARTED" },
  { title: "Schedule locked", status: "NO_STARTED" },
  { title: "Final walkthrough", status: "NO_STARTED" }
];
