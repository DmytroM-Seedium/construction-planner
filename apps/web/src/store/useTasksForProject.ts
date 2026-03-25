import { useCallback, useSyncExternalStore } from "react";
import { taskRepository } from "@/entities/repositories/taskRepository";

const EMPTY_TASKS: ReturnType<typeof taskRepository.getTasksSnapshot> = [];

export function useTasksForProject(userId: string | null, projectId: string | null) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!userId || !projectId) return () => {};
      return taskRepository.subscribeToTasks(userId, projectId, () => onChange());
    },
    [userId, projectId]
  );

  const getSnapshot = useCallback(() => {
    if (!userId || !projectId) return EMPTY_TASKS;
    return taskRepository.getTasksSnapshot(userId, projectId);
  }, [userId, projectId]);

  const getServerSnapshot = useCallback(() => EMPTY_TASKS, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
