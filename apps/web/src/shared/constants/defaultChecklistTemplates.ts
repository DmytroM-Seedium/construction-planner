import type { TaskStatus } from "@construction-planner/shared/types";

export type DefaultChecklistTemplate = {
  title: string;
  description: string;
  status: TaskStatus;
};

export const DEFAULT_CHECKLIST_TEMPLATES: readonly DefaultChecklistTemplate[] =
  [
    {
      title: "Site safety review",
      description: "Confirm site safety requirements.",
      status: "NO_STARTED",
    },
    {
      title: "Materials confirmed",
      description: "Verify materials on site or ordered.",
      status: "NO_STARTED",
    },
    {
      title: "Schedule locked",
      description: "Lock dates with stakeholders.",
      status: "NO_STARTED",
    },
    {
      title: "Final walkthrough",
      description: "Complete final inspection checklist.",
      status: "NO_STARTED",
    },
  ] as const;

export const createDefaultChecklistTemplates =
  (): readonly DefaultChecklistTemplate[] => DEFAULT_CHECKLIST_TEMPLATES;

