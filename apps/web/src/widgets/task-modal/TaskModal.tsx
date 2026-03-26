import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  ChecklistItem,
  Task,
  TaskStatus,
} from "@construction-planner/shared/types";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Plus,
  Square,
} from "lucide-react";
import { taskRepository } from "@/entities/repositories/taskRepository";
import { checklistRepository } from "@/entities/repositories/checklistRepository";
import { useUiStore } from "@/shared/uiStore";
import { useChecklistItemsForTask } from "@/store/useChecklistItemsForTask";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  projectId: string;
  tasks: Task[];
};

const statusDotClass: Record<TaskStatus, string> = {
  NO_STARTED: "bg-slate-400",
  IN_PROGRESS: "bg-amber-400",
  BLOCKED: "bg-red-500",
  AWAITING_CHECK: "bg-sky-500",
  DONE: "bg-emerald-500",
};

function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "NO_STARTED":
      return "Not started";
    case "IN_PROGRESS":
      return "In progress";
    case "BLOCKED":
      return "Blocked";
    case "AWAITING_CHECK":
      return "Final Check awaiting";
    case "DONE":
      return "Done";
  }
}

function statusIcon(status: TaskStatus) {
  switch (status) {
    case "DONE":
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    case "BLOCKED":
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case "AWAITING_CHECK":
      return <CircleSlash className="h-5 w-5 text-sky-600" />;
    case "IN_PROGRESS":
      return <CircleSlash className="h-5 w-5 text-amber-600" />;
    case "NO_STARTED":
      return <Square className="h-5 w-5 text-slate-400" />;
  }
}

export const TaskModal = ({ userId, projectId, tasks }: Props) => {
  const {
    taskModalOpen,
    taskModalMode,
    contextPosition,
    closeTaskModal,
    selectedTaskId,
  } = useUiStore();

  const selectedTask = useMemo(
    () =>
      selectedTaskId
        ? (tasks.find((t) => t.id === selectedTaskId) ?? null)
        : null,
    [selectedTaskId, tasks],
  );

  const [title, setTitle] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");

  useEffect(() => {
    if (!taskModalOpen) return;
    if (taskModalMode === "create") {
      setTitle("");
    }
  }, [taskModalMode, taskModalOpen]);

  useEffect(() => {
    if (!taskModalOpen) setNewChecklistTitle("");
  }, [taskModalOpen]);

  useEffect(() => {
    if (taskModalOpen && taskModalMode === "edit") setNewChecklistTitle("");
  }, [selectedTaskId, taskModalOpen, taskModalMode]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (taskModalMode === "create") {
      await taskRepository.createTask({
        userId,
        projectId,
        title,
        x: contextPosition?.x ?? 50,
        y: contextPosition?.y ?? 50,
      });
    }
    closeTaskModal();
    setTitle("");
  };

  const checklistItemsEnabled =
    taskModalOpen && taskModalMode === "edit" ? true : false;

  const checklistItems = useChecklistItemsForTask(
    checklistItemsEnabled ? userId : null,
    checklistItemsEnabled ? selectedTaskId : null,
  );

  const isBlocked = useMemo(
    () => checklistItems.some((i) => i.status === "BLOCKED"),
    [checklistItems],
  );

  const stepsText = useMemo(() => {
    const count = checklistItems.length;
    return `${count} STEP${count === 1 ? "" : "S"}`;
  }, [checklistItems.length]);

  const onAddChecklistItem = async () => {
    const nextTitle = newChecklistTitle.trim();
    if (!nextTitle) return;
    if (!selectedTaskId) return;
    await checklistRepository.createChecklistItem({
      userId,
      taskId: selectedTaskId,
      title: nextTitle,
      status: "NO_STARTED",
    });
    setNewChecklistTitle("");
  };

  return (
    <Dialog
      open={taskModalOpen}
      onOpenChange={(open) => !open && closeTaskModal()}
    >
      <DialogContent className="max-w-[520px]">
        {taskModalMode === "create" ? (
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>Create task</DialogTitle>
              <DialogDescription>
                Create a task pinned to the plan.
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 pb-4 pt-4">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Task title"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeTaskModal}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle>{selectedTask?.title ?? "Task"}</DialogTitle>
              {isBlocked && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Ticket progress is blocked
                </div>
              )}
            </DialogHeader>

            <Separator />

            <div className="px-5 py-2">
              <Accordion type="single" collapsible defaultValue="checklist">
                <AccordionItem value="checklist" className="border-b-0">
                  <AccordionTrigger className="py-4 text-base font-semibold hover:no-underline">
                    Checklist
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Badge className="h-7 w-7 justify-center rounded-md bg-slate-900 p-0 text-[11px] text-white">
                          CI
                        </Badge>
                        <div className="text-sm font-medium">
                          {selectedTask?.title ?? "Checklist"}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stepsText}
                      </div>
                    </div>

                    <ScrollArea className="mt-2 h-[360px] pr-2">
                      <ul className="divide-y">
                        {checklistItems.map((item) => (
                          <li key={item.id} className="flex gap-3 py-3">
                            <div className="mt-0.5 flex h-7 w-7 items-center justify-center">
                              {statusIcon(item.status)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className={cn(
                                  "truncate text-sm font-medium",
                                  item.status === "BLOCKED" && "text-red-600",
                                )}
                              >
                                {item.title}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    statusDotClass[item.status],
                                  )}
                                />
                                <span>{statusLabel(item.status)}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>

                    <div className="mt-2 rounded-md border">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-3 text-left"
                        onClick={() => {
                          const el = document.getElementById(
                            "new-checklist-item-input",
                          );
                          el?.focus();
                        }}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md border text-blue-600">
                          <Plus className="h-4 w-4" />
                        </div>
                        <div className="text-sm font-semibold text-blue-600">
                          ADD NEW ITEM
                        </div>
                      </button>
                      <div className="px-3 pb-3">
                        <div className="flex gap-2">
                          <Input
                            id="new-checklist-item-input"
                            value={newChecklistTitle}
                            onChange={(e) =>
                              setNewChecklistTitle(e.target.value)
                            }
                            placeholder="New checklist item"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={onAddChecklistItem}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
