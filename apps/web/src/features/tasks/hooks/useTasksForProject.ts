import { useCallback, useEffect, useSyncExternalStore } from "react";
import { taskRepository } from "@/features/tasks/data/task.repository";
import { useTaskFacadeStore } from "@/features/tasks/store/task.store";

const EMPTY_TASKS: ReturnType<typeof taskRepository.getTasksSnapshot> = [];

export function useTasksForProject(userId: string | null, projectId: string | null) {
  const setSnapshot = useTaskFacadeStore((s) => s.setProjectTasksSnapshot);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!userId || !projectId) return () => {};
      return taskRepository.subscribeToTasks(userId, projectId, (tasks) => {
        setSnapshot(userId, projectId, tasks);
        onChange();
      });
    },
    [projectId, setSnapshot, userId],
  );

  const getSnapshot = useCallback(() => {
    if (!userId || !projectId) return EMPTY_TASKS;
    return taskRepository.getTasksSnapshot(userId, projectId);
  }, [userId, projectId]);

  const getServerSnapshot = useCallback(() => EMPTY_TASKS, []);

  const tasks = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!userId || !projectId) return;
    setSnapshot(userId, projectId, tasks);
  }, [projectId, setSnapshot, tasks, userId]);

  return tasks;
}

