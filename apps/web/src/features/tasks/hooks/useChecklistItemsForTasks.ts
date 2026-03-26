import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ChecklistItem } from "@construction-planner/shared/types";
import { checklistRepository } from "@/features/tasks/data/checklist.repository";
import { useTaskFacadeStore } from "@/features/tasks/store/task.store";

const EMPTY: ChecklistItem[] = [];

export function useChecklistItemsForTasks(userId: string | null, taskIds: string[]) {
  const recomputeDerivedStatuses = useTaskFacadeStore((s) => s.recomputeDerivedStatuses);

  const { taskIdsSorted, taskIdsKey } = useMemo(() => {
    const sorted = [...taskIds].sort();
    return { taskIdsSorted: sorted, taskIdsKey: sorted.join(",") };
  }, [taskIds]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!userId) return () => {};
      if (taskIdsSorted.length === 0) return () => {};
      return checklistRepository.subscribeToChecklistItemsByTasks(
        userId,
        taskIdsSorted,
        (items) => {
          recomputeDerivedStatuses(items);
          onChange();
        },
      );
    },
    [recomputeDerivedStatuses, taskIdsKey, userId],
  );

  const getSnapshot = useCallback((): ChecklistItem[] => {
    if (!userId) return EMPTY;
    if (taskIdsSorted.length === 0) return EMPTY;
    return checklistRepository.getChecklistItemsByTasksSnapshot(userId, taskIdsSorted);
  }, [taskIdsKey, userId]);

  const getServerSnapshot = useCallback(() => EMPTY, []);

  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    recomputeDerivedStatuses(items);
  }, [items, recomputeDerivedStatuses]);

  return items;
}

