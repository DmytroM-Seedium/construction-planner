import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ChecklistItem } from "@construction-planner/shared/types";
import { checklistRepository } from "@/features/tasks/data/checklist.repository";
import { useTaskFacadeStore } from "@/features/tasks/store/task.store";

const EMPTY: ChecklistItem[] = [];

export function useChecklistItemsForTask(userId: string | null, taskId: string | null) {
  const recomputeDerivedStatuses = useTaskFacadeStore((s) => s.recomputeDerivedStatuses);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!userId || !taskId) return () => {};
      return checklistRepository.subscribeToChecklistItemsByTask(userId, taskId, (items) => {
        recomputeDerivedStatuses(items);
        onChange();
      });
    },
    [recomputeDerivedStatuses, taskId, userId],
  );

  const getSnapshot = useCallback((): ChecklistItem[] => {
    if (!userId || !taskId) return EMPTY;
    return checklistRepository.getChecklistItemsByTaskSnapshot(userId, taskId);
  }, [userId, taskId]);

  const getServerSnapshot = useCallback(() => EMPTY, []);

  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    recomputeDerivedStatuses(items);
  }, [items, recomputeDerivedStatuses]);

  return items;
}

