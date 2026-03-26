import { useCallback, useSyncExternalStore } from "react";
import type { Project } from "@construction-planner/shared/types";
import { projectRepository } from "@/features/projects/data/project.repository";

const EMPTY: Project[] = [];

export function useProjectsForUser(userId: string | null) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!userId) return () => {};
      return projectRepository.subscribeToProjects(userId, () => onChange());
    },
    [userId],
  );

  const getSnapshot = useCallback((): Project[] => {
    if (!userId) return EMPTY;
    // Important: return the cached array reference to avoid unstable snapshots.
    return projectRepository.getProjectsSnapshot(userId);
  }, [userId]);

  const getServerSnapshot = useCallback(() => EMPTY, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

