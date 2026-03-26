import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { deriveTaskStatus } from "@/features/tasks/deriveTaskStatus";
import { TaskModal } from "@/features/tasks/components/TaskModal";
import { SyncStatusBadge } from "@/core/infrastructure/sync/components/SyncStatusBadge";
import { useUiStore } from "@/shared/uiStore";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useProjectsForUser } from "@/store/useProjectsForUser";
import { useTasksForProject } from "@/features/tasks/hooks/useTasksForProject";
import { useChecklistItemsForTasks } from "@/features/tasks/hooks/useChecklistItemsForTasks";
import { projectRepository } from "@/features/projects/data/project.repository";
import { taskRepository } from "@/features/tasks/data/task.repository";
import { PlanCanvas } from "@/features/plan/components/PlanCanvas";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";
import { Trash2 } from "lucide-react";
import { STATUS_UI } from "@/features/tasks/components/checklistItemFormFields";

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const [persistHydrated, setPersistHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  );
  const userId = useAuthStore((s) => s.userId);
  const clearSession = useAuthStore((s) => s.clearSession);
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
  const resetUi = useUiStore((s) => s.reset);

  const [newProjectName, setNewProjectName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [planImageError, setPlanImageError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<
    | null
    | { type: "project"; id: string; name: string }
    | { type: "task"; id: string; name: string }
  >(null);
  const projects = useProjectsForUser(userId);
  const selectedProject = useMemo(
    () =>
      (projects as Project[]).find(
        (project) => project.id === selectedProjectId,
      ) ?? null,
    [projects, selectedProjectId],
  );

  const tasks = useTasksForProject(userId, selectedProjectId);
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const checklistItems = useChecklistItemsForTasks(userId, taskIds);

  const taskStatusById = useMemo(() => {
    const byTask: Record<string, ChecklistItem[]> = {};
    for (const item of checklistItems) {
      (byTask[item.taskId] ??= []).push(item);
    }

    const next: Record<string, TaskStatus> = {};
    for (const task of tasks) {
      next[task.id] = deriveTaskStatus(byTask[task.id] ?? []);
    }
    return next;
  }, [checklistItems, tasks]);

  useEffect(() => {
    if (persistHydrated) return;
    return useAuthStore.persist.onFinishHydration(() =>
      setPersistHydrated(true),
    );
  }, [persistHydrated]);

  useEffect(() => {
    if (!persistHydrated) return;
    if (!userId) navigate("/");
  }, [navigate, persistHydrated, userId]);

  useEffect(() => {
    if (!persistHydrated) return;
    // Prevent cross-user leakage in SPA logout->login flow:
    // clear any stale UI selection + cached blob URL when user changes.
    resetUi();
    setPlanImageError(null);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [persistHydrated, resetUi, userId]);

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
    if (!selectedProject) {
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (!userId) return;

    let cancelled = false;
    projectImageService
      .getAttachmentBlobUrlForUser(userId, selectedProject.id)
      .then((nextUrl) => {
        if (cancelled) return;
        setImageUrl((prevUrl) => {
          if (prevUrl && prevUrl !== nextUrl) URL.revokeObjectURL(prevUrl);
          return nextUrl;
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProject, userId]);

  const createProject = async () => {
    if (!userId) return;
    const name = newProjectName.trim() || `Project ${projects.length + 1}`;
    const project = await projectRepository.createProject(userId, name);
    setNewProjectName("");
    setSelectedProjectId(project.id);
  };

  const onImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
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
    const nextUrl = await projectImageService.getAttachmentBlobUrlForUser(
      userId,
      selectedProjectId,
    );
    setImageUrl((prev) => {
      if (prev && prev !== nextUrl) URL.revokeObjectURL(prev);
      return nextUrl;
    });
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
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
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
                resetUi();
                setImageUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
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
            <Field>
              <FieldLabel htmlFor="new-project-name">Project name</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="new-project-name"
                  className="min-w-0 flex-1"
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
            </Field>

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
            </div>
          </CardHeader>
          <CardContent>
            {!selectedProject && (
              <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">
                Select or create a project to start.
              </div>
            )}

            {selectedProject && !imageUrl && (
              <Field>
                <div className="relative rounded-md border border-dashed px-10 py-16 text-center">
                  <FieldLabel
                    htmlFor="plan-upload"
                    className="relative z-10 flex w-full cursor-pointer flex-col items-center justify-center font-normal pointer-events-none"
                  >
                    <span className="text-sm font-medium">
                      Upload plan image
                    </span>
                  </FieldLabel>
                  <FieldDescription className="relative z-10 mt-1 text-center pointer-events-none">
                    JPEG, PNG, or WebP — used as your plan canvas.
                  </FieldDescription>
                  {planImageError && (
                    <p
                      className="relative z-10 mt-2 text-sm text-destructive pointer-events-none"
                      role="alert"
                    >
                      {planImageError}
                    </p>
                  )}
                  <Input
                    id="plan-upload"
                    className="absolute inset-0 z-20 h-full min-h-full w-full cursor-pointer border-0 p-0 opacity-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    type="file"
                    accept={PLAN_IMAGE_ACCEPT}
                    onChange={onImageUpload}
                  />
                </div>
              </Field>
            )}

            {selectedProject && imageUrl && (
              <PlanCanvas
                imageUrl={imageUrl}
                tasks={tasks}
                taskStatusById={taskStatusById}
                pinBgClass={pinBgClass}
                onOpenTask={onOpenTask}
                onRightClickCreateAt={(pos) => openTaskModal("create", pos)}
                previewPin={
                  taskModalOpen && taskModalMode === "create" ? contextPosition : null
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="space-y-1">
              <CardTitle>Tasks</CardTitle>
              <div className="text-xs text-muted-foreground">
                Right-click the plan to create a task
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks && tasks.length > 0 && (
              <ScrollArea className="h-[calc(100vh-14rem)] pr-2">
                <ul className="space-y-1">
                  {tasks.map((task) => {
                    const status = taskStatusById[task.id] ?? "NO_STARTED";
                    return (
                      <li key={task.id} className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-w-0 flex-1 justify-start gap-2"
                          onClick={() => onOpenTask(task.id)}
                        >
                          <span className="flex h-5 w-5 items-center justify-center">
                            {STATUS_UI[status].icon("h-4 w-4")}
                          </span>
                          <span className="truncate">{task.title}</span>
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
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
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
