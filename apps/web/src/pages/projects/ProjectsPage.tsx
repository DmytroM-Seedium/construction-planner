import {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import type {
  ChecklistItem,
  Project,
  TaskStatus,
} from "@construction-planner/shared/types";
import { projectImageService } from "@/features/project-image/projectImageService";
import {
  PLAN_IMAGE_ACCEPT,
  validatePlanImage,
} from "@/features/project-image/validatePlanImage";
import { TaskModal } from "@/widgets/task-modal/TaskModal";
import { SyncStatusBadge } from "@/widgets/sync-status/SyncStatusBadge";
import { useUiStore } from "@/shared/uiStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectsForUser } from "@/store/useProjectsForUser";
import { useTasksForProject } from "@/store/useTasksForProject";
import { useChecklistItemsForTasks } from "@/store/useChecklistItemsForTasks";
import { projectRepository } from "@/entities/repositories/projectRepository";
import { taskRepository } from "@/entities/repositories/taskRepository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const [persistHydrated, setPersistHydrated] = useState(() =>
    useTaskStore.persist.hasHydrated(),
  );
  const userId = useTaskStore((s) => s.userId);
  const clearSession = useTaskStore((s) => s.clearSession);
  const {
    selectedProjectId,
    setSelectedProjectId,
    selectedTaskId,
    setSelectedTaskId,
    openTaskModal,
    closeTaskModal,
    taskModalOpen,
    taskModalMode,
    contextPosition,
  } = useUiStore();

  const [newProjectName, setNewProjectName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [planImageError, setPlanImageError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<
    | null
    | { type: "project"; id: string; name: string }
    | { type: "task"; id: string; name: string }
  >(null);
  const projects = useProjectsForUser(userId);

  const tasks = useTasksForProject(userId, selectedProjectId);
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const checklistItems = useChecklistItemsForTasks(userId, taskIds);

  const taskStatusById = useMemo(() => {
    const deriveStatus = (items: ChecklistItem[]): TaskStatus => {
      if (items.length === 0) return "NO_STARTED";
      const statuses = items.map((i) => i.status);
      const all = (s: TaskStatus) => statuses.every((x) => x === s);
      const any = (s: TaskStatus) => statuses.some((x) => x === s);

      if (any("BLOCKED")) return "BLOCKED";
      if (any("AWAITING_CHECK")) return "AWAITING_CHECK";
      if (all("DONE")) return "DONE";
      if (all("NO_STARTED")) return "NO_STARTED";
      return "IN_PROGRESS";
    };

    const byTask: Record<string, ChecklistItem[]> = {};
    for (const item of checklistItems) {
      (byTask[item.taskId] ??= []).push(item);
    }

    const next: Record<string, TaskStatus> = {};
    for (const task of tasks) {
      next[task.id] = deriveStatus(byTask[task.id] ?? []);
    }
    return next;
  }, [checklistItems, tasks]);

  useEffect(() => {
    if (persistHydrated) return;
    return useTaskStore.persist.onFinishHydration(() =>
      setPersistHydrated(true),
    );
  }, [persistHydrated]);

  useEffect(() => {
    if (!persistHydrated) return;
    if (!userId) navigate("/");
  }, [navigate, persistHydrated, userId]);

  useEffect(() => {
    if (!persistHydrated) return;
    if (!userId) return;
    if (selectedProjectId) return;
    if (projects[0]) setSelectedProjectId(projects[0].id);
  }, [
    persistHydrated,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    userId,
  ]);

  useEffect(() => {
    if (!selectedProjectId) return;
    projectImageService
      .getAttachmentBlobUrl(selectedProjectId)
      .then(setImageUrl);
  }, [selectedProjectId]);

  const createProject = async () => {
    if (!userId) return;
    const name = newProjectName.trim() || `Project ${projects.length + 1}`;
    const project = await projectRepository.createProject(userId, name);
    setNewProjectName("");
    setSelectedProjectId(project.id);
  };

  const onImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedProjectId) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPlanImageError(null);
    const check = validatePlanImage(file);
    if (!check.ok) {
      setPlanImageError(check.message);
      return;
    }
    await projectImageService.saveAttachment(selectedProjectId, file);
    setImageUrl(
      await projectImageService.getAttachmentBlobUrl(selectedProjectId),
    );
    if (navigator.onLine) {
      try {
        await projectImageService.uploadOnline(selectedProjectId, file);
      } catch (error) {
        // If the browser thinks it's online but the API is unreachable, keep the local
        // attachment and let sync retry later.
        const message =
          error instanceof Error
            ? error.message
            : "Plan image upload failed. Will retry when online.";
        setPlanImageError(message);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog || !userId) return;
    if (deleteDialog.type === "project") {
      await projectRepository.softDeleteProject(userId, deleteDialog.id);
      if (selectedProjectId === deleteDialog.id) {
        setSelectedProjectId(null);
        setImageUrl(null);
      }
    } else {
      await taskRepository.softDeleteTask(userId, deleteDialog.id);
      if (selectedTaskId === deleteDialog.id) {
        setSelectedTaskId(null);
        closeTaskModal();
      }
    }
    setDeleteDialog(null);
  };

  const onRightClickPlan = (event: MouseEvent) => {
    event.preventDefault();
    const rect = (
      event.currentTarget as HTMLDivElement
    ).getBoundingClientRect();
    const x = Number(
      (((event.clientX - rect.left) / rect.width) * 100).toFixed(2),
    );
    const y = Number(
      (((event.clientY - rect.top) / rect.height) * 100).toFixed(2),
    );
    openTaskModal("create", { x, y });
  };

  const pinBgClass: Record<TaskStatus, string> = {
    NO_STARTED: "bg-amber-400 text-amber-950",
    IN_PROGRESS: "bg-sky-500 text-white",
    BLOCKED: "bg-red-500 text-white",
    AWAITING_CHECK: "bg-purple-500 text-white",
    DONE: "bg-emerald-500 text-white",
  };

  const onOpenTask = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      openTaskModal("edit");
    },
    [openTaskModal, setSelectedTaskId],
  );

  const selectedProject = useMemo(
    () =>
      (projects as Project[]).find(
        (project) => project.id === selectedProjectId,
      ) ?? null,
    [projects, selectedProjectId],
  );

  if (!persistHydrated) return null;
  if (!userId) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold ">Construction Planner</div>
            <Separator orientation="vertical" className="h-6" />
            <div className="text-sm text-muted-foreground">
              {selectedProject?.name ?? "Select a project"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                clearSession();
                navigate("/");
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-12 gap-4 p-4">
        <Card className="col-span-3 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder={`Project ${projects.length + 1}`}
              />
              <Button
                onClick={createProject}
                type="button"
                className="shrink-0"
              >
                Add
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-14rem)] pr-2">
              <ul className="space-y-1">
                {projects.map((project) => {
                  const isActive = selectedProjectId === project.id;
                  return (
                    <li key={project.id} className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant={isActive ? "secondary" : "ghost"}
                        className="min-w-0 flex-1 justify-start"
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        {project.name}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete project ${project.name}`}
                        onClick={() =>
                          setDeleteDialog({
                            type: "project",
                            id: project.id,
                            name: project.name,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="col-span-6 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Workspace</CardTitle>
              <div className="text-xs text-muted-foreground">
                Right-click the plan to create a task
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedProject && (
              <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">
                Select or create a project to start.
              </div>
            )}

            {selectedProject && !imageUrl && (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
                <div className="text-sm font-medium">Upload plan image</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  JPEG, PNG, or WebP — used as your plan canvas.
                </div>
                {planImageError && (
                  <div className="mt-2 text-xs text-destructive">{planImageError}</div>
                )}
                <input
                  className="hidden"
                  type="file"
                  accept={PLAN_IMAGE_ACCEPT}
                  onChange={onImageUpload}
                />
              </label>
            )}

            {imageUrl && (
              <div className="rounded-md border bg-background p-2">
                <div
                  className="relative mx-auto w-full"
                  onContextMenu={onRightClickPlan}
                >
                  <img
                    src={imageUrl}
                    alt="Plan"
                    className="max-h-[72vh] w-full rounded object-contain"
                  />

                  {tasks.map((task) => {
                    const status = taskStatusById[task.id] ?? "NO_STARTED";
                    return (
                      <button
                        key={task.id}
                        type="button"
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${task.x}%`, top: `${task.y}%` }}
                        title={`${task.title}`}
                        onClick={() => onOpenTask(task.id)}
                      >
                        <span
                          className={[
                            "grid h-7 w-7 place-items-center rounded-full shadow-sm ring-2 ring-background",
                            pinBgClass[status],
                          ].join(" ")}
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-black/20" />
                        </span>
                      </button>
                    );
                  })}

                  {taskModalOpen &&
                    taskModalMode === "create" &&
                    contextPosition && (
                      <div
                        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${contextPosition.x}%`,
                          top: `${contextPosition.y}%`,
                        }}
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900/80 shadow-sm ring-2 ring-background">
                          <span className="h-2.5 w-2.5 rounded-full bg-white/70" />
                        </span>
                      </div>
                    )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-[calc(100vh-14rem)] pr-2">
              <ul className="space-y-1">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-w-0 flex-1 justify-start"
                      onClick={() => onOpenTask(task.id)}
                    >
                      {task.title}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete task ${task.title}`}
                      onClick={() =>
                        setDeleteDialog({
                          type: "task",
                          id: task.id,
                          name: task.title,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        {selectedProjectId && (
          <TaskModal
            userId={userId}
            projectId={selectedProjectId}
            tasks={tasks}
          />
        )}

        <Dialog
          open={deleteDialog !== null}
          onOpenChange={(open) => !open && setDeleteDialog(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {deleteDialog &&
                  (deleteDialog.type === "project"
                    ? "Delete project?"
                    : "Delete task?")}
              </DialogTitle>
              <DialogDescription>
                {deleteDialog?.type === "project"
                  ? `“${deleteDialog.name}” and its tasks will be removed. This cannot be undone.`
                  : deleteDialog?.type === "task"
                    ? `“${deleteDialog.name}” will be removed. This cannot be undone.`
                    : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialog(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void confirmDelete()}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};
