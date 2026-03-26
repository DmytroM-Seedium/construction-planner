import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ChecklistItem } from "@construction-planner/shared/types";
import { checklistRepository } from "@/entities/repositories/checklistRepository";

const EMPTY: ChecklistItem[] = [];

export function useChecklistItemsForTasks(
  userId: string | null,
  taskIds: string[],
) {
  const { taskIdsSorted, taskIdsKey } = useMemo(() => {
    const sorted = [...taskIds].sort();
    return {
      taskIdsSorted: sorted,
      taskIdsKey: sorted.join(","),
    };
  }, [taskIds]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!userId) return () => {};
      if (taskIdsSorted.length === 0) return () => {};
      return checklistRepository.subscribeToChecklistItemsByTasks(
        userId,
        taskIdsSorted,
        () => onChange(),
      );
    },
    [userId, taskIdsKey],
  );

  const getSnapshot = useCallback((): ChecklistItem[] => {
    if (!userId) return EMPTY;
    if (taskIdsSorted.length === 0) return EMPTY;
    return checklistRepository.getChecklistItemsByTasksSnapshot(userId, taskIdsSorted);
  }, [userId, taskIdsKey]);

  const getServerSnapshot = useCallback(() => EMPTY, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

