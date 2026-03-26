import { useCallback, useSyncExternalStore } from "react";
import type { ChecklistItem } from "@construction-planner/shared/types";
import { checklistRepository } from "@/entities/repositories/checklistRepository";

const EMPTY: ChecklistItem[] = [];

export function useChecklistItemsForTask(
  userId: string | null,
  taskId: string | null,
) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!userId || !taskId) return () => {};
      return checklistRepository.subscribeToChecklistItemsByTask(
        userId,
        taskId,
        () => onChange(),
      );
    },
    [userId, taskId],
  );

  const getSnapshot = useCallback((): ChecklistItem[] => {
    if (!userId || !taskId) return EMPTY;
    return checklistRepository.getChecklistItemsByTaskSnapshot(userId, taskId);
  }, [userId, taskId]);

  const getServerSnapshot = useCallback(() => EMPTY, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

