import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChecklistItem,
  Task,
  TaskStatus,
} from "@construction-planner/shared/types";
import { Plus } from "lucide-react";
import { taskRepository } from "@/entities/repositories/taskRepository";
import { checklistRepository } from "@/entities/repositories/checklistRepository";
import { deriveTaskStatus } from "@/features/tasks/deriveTaskStatus";
import { useUiStore } from "@/shared/uiStore";
import { useChecklistItemsForTask } from "@/store/useChecklistItemsForTask";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ChecklistItemFormFields,
  STATUS_DOT_CLASS,
  STATUS_UI,
  type ChecklistDraft,
} from "./checklistItemFormFields";

type Props = {
  userId: string;
  projectId: string;
  tasks: Task[];
};

function useDebouncedMap() {
  const timers = useRef(new Map<string, number>());
  useEffect(() => {
    return () => {
      for (const t of timers.current.values()) window.clearTimeout(t);
      timers.current.clear();
    };
  }, []);

  return useCallback((key: string, fn: () => void, ms: number) => {
    const existing = timers.current.get(key);
    if (existing) window.clearTimeout(existing);
    const t = window.setTimeout(() => {
      timers.current.delete(key);
      fn();
    }, ms);
    timers.current.set(key, t);
  }, []);
}

function stepsCountText(count: number) {
  return `${count} step${count === 1 ? "" : "s"}`;
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
  const [description, setDescription] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (!taskModalOpen) return;
    if (taskModalMode === "create") {
      setTitle("");
      setDescription("");
    }
  }, [taskModalMode, taskModalOpen]);

  useEffect(() => {
    if (!taskModalOpen) return;
    if (taskModalMode !== "edit") return;
    setEditDescription(selectedTask?.description ?? "");
  }, [selectedTask?.id, taskModalMode, taskModalOpen]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (taskModalMode === "create") {
      const nextTitle = title.trim();
      const nextDescription = description.trim();
      if (!nextTitle) return;
      if (!nextDescription) return;
      await taskRepository.createTask({
        userId,
        projectId,
        title: nextTitle,
        description: nextDescription,
        x: contextPosition?.x ?? 50,
        y: contextPosition?.y ?? 50,
      });
    }
    closeTaskModal();
    setTitle("");
    setDescription("");
  };

  const checklistItemsEnabled =
    taskModalOpen && taskModalMode === "edit" ? true : false;

  const checklistItems = useChecklistItemsForTask(
    checklistItemsEnabled ? userId : null,
    checklistItemsEnabled ? selectedTaskId : null,
  );

  const derivedStatus = useMemo(
    () => deriveTaskStatus(checklistItems),
    [checklistItems],
  );

  const stepsText = useMemo(
    () => stepsCountText(checklistItems.length),
    [checklistItems.length],
  );

  const schedule = useDebouncedMap();

  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(
    null,
  );
  const [draftById, setDraftById] = useState<Record<string, ChecklistDraft>>(
    {},
  );

  const draftByIdRef = useRef<Record<string, ChecklistDraft>>({});
  useEffect(() => {
    draftByIdRef.current = draftById;
  });

  useEffect(() => {
    if (!taskModalOpen) {
      setActiveChecklistId(null);
      setDraftById({});
    }
  }, [taskModalOpen]);

  useEffect(() => {
    if (!activeChecklistId) return;
    const item = checklistItems.find((i) => i.id === activeChecklistId);
    if (!item) return;
    const next: ChecklistDraft = {
      title: item.title,
      description: item.description ?? "",
      status: item.status,
    };
    setDraftById((prev) => ({ ...prev, [activeChecklistId]: next }));
    draftByIdRef.current = {
      ...draftByIdRef.current,
      [activeChecklistId]: next,
    };
  }, [activeChecklistId, checklistItems]);

  const persistChecklistDraft = useCallback(
    (id: string, draft?: ChecklistDraft) => {
      const item = checklistItems.find((i) => i.id === id);
      const d = draft ?? draftByIdRef.current[id];
      if (!item || !d) return;
      const nextTitle = d.title.trim();
      const nextDescription = d.description.trim();
      if (!nextTitle) {
        setDraftById((prev) => ({
          ...prev,
          [id]: {
            title: item.title,
            description: item.description ?? "",
            status: item.status,
          },
        }));
        draftByIdRef.current = {
          ...draftByIdRef.current,
          [id]: {
            title: item.title,
            description: item.description ?? "",
            status: item.status,
          },
        };
        return;
      }
      void checklistRepository.upsertChecklistItem({
        ...item,
        title: nextTitle,
        description: nextDescription,
        status: d.status,
        updatedAt: Date.now(),
      });
    },
    [checklistItems],
  );

  const schedulePersistChecklist = useCallback(
    (id: string) => {
      schedule(`${id}:persist`, () => persistChecklistDraft(id), 200);
    },
    [persistChecklistDraft, schedule],
  );

  const applyChecklistPatch = useCallback(
    (item: ChecklistItem, patch: Partial<ChecklistDraft>) => {
      const cur =
        draftByIdRef.current[item.id] ??
        ({
          title: item.title,
          description: item.description ?? "",
          status: item.status,
        } satisfies ChecklistDraft);
      const next: ChecklistDraft = { ...cur, ...patch };
      draftByIdRef.current = { ...draftByIdRef.current, [item.id]: next };
      setDraftById((prev) => ({ ...prev, [item.id]: next }));
      if (patch.status !== undefined) {
        void persistChecklistDraft(item.id, next);
      } else {
        schedulePersistChecklist(item.id);
      }
    },
    [persistChecklistDraft, schedulePersistChecklist],
  );

  const saveTaskDescription = useCallback(
    async (next: string) => {
      if (!selectedTask) return;
      const trimmed = next.trim();
      if (!trimmed) return;
      if (trimmed === selectedTask.description) return;
      await taskRepository.upsertTask({
        ...selectedTask,
        description: trimmed,
        updatedAt: Date.now(),
      });
    },
    [selectedTask],
  );

  useEffect(() => {
    if (!taskModalOpen) return;
    if (taskModalMode !== "edit") return;
    if (!selectedTask) return;
    schedule(
      "task:description",
      () => void saveTaskDescription(editDescription),
      250,
    );
  }, [
    editDescription,
    saveTaskDescription,
    schedule,
    selectedTask,
    taskModalMode,
    taskModalOpen,
  ]);

  const [addingOpen, setAddingOpen] = useState(false);
  const [newDraft, setNewDraft] = useState<ChecklistDraft>({
    title: "",
    description: "",
    status: "NO_STARTED",
  });

  useEffect(() => {
    if (!taskModalOpen) {
      setAddingOpen(false);
      setNewDraft({ title: "", description: "", status: "NO_STARTED" });
    }
  }, [taskModalOpen]);

  const addNewItem = useCallback(async () => {
    if (!selectedTaskId) return;
    const nextTitle = newDraft.title.trim();
    const nextDescription = newDraft.description.trim();
    if (!nextTitle) return;
    await checklistRepository.createChecklistItem({
      userId,
      taskId: selectedTaskId,
      title: nextTitle,
      description: nextDescription,
      status: newDraft.status,
    });
    setNewDraft({ title: "", description: "", status: "NO_STARTED" });
  }, [
    newDraft.description,
    newDraft.status,
    newDraft.title,
    selectedTaskId,
    userId,
  ]);

  const addFormValid = newDraft.title.trim().length > 0;

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
            </DialogHeader>
            <div className="px-5 pb-4 pt-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="task-create-title">Title</FieldLabel>
                  <Input
                    id="task-create-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Task title"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="task-create-description">
                    Description
                  </FieldLabel>
                  <Input
                    id="task-create-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Task description"
                    required
                  />
                </Field>
              </FieldGroup>
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
              <DialogTitle className="pr-10">
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 items-center justify-center">
                      {STATUS_UI[derivedStatus].icon()}
                    </div>
                    <div className="flex flex-col">
                      <h1 className="truncate">
                        {selectedTask?.title ?? "Task"}
                      </h1>
                      <div
                        className={cn(
                          "mt-1 mb-2 flex items-center gap-2 text-sm",
                          STATUS_UI[derivedStatus].textClass,
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            STATUS_DOT_CLASS[derivedStatus],
                          )}
                        />
                        <span className="truncate">
                          {STATUS_UI[derivedStatus].ticketText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Separator />

            <div className="px-5 py-3">
              <h2 className="truncate">{editDescription}</h2>
            </div>

            <Separator />

            <div className="px-5 py-2">
              <Accordion type="single" collapsible defaultValue="checklist">
                <AccordionItem value="checklist" className="border-b-0">
                  <AccordionTrigger className="py-4 text-base font-semibold hover:no-underline">
                    {`Checklist - ${stepsText}`}
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <ScrollArea className="mt-0 h-[360px] pr-2">
                      <ul className="divide-y">
                        {checklistItems.map((item) => {
                          const isActive = item.id === activeChecklistId;
                          const draft = draftById[item.id] ?? {
                            title: item.title,
                            description: item.description ?? "",
                            status: item.status,
                          };

                          return (
                            <li key={item.id} className="py-2">
                              <button
                                type="button"
                                className={cn(
                                  "flex w-full gap-3 rounded-md px-2 py-2 text-left hover:bg-accent",
                                  isActive && "bg-accent",
                                )}
                                onClick={() =>
                                  setActiveChecklistId((cur) =>
                                    cur === item.id ? null : item.id,
                                  )
                                }
                              >
                                <div className="mt-0.5 flex h-7 w-7 items-center justify-center">
                                  {STATUS_UI[item.status].icon()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium">
                                    {item.title}
                                  </div>
                                  <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                      <span
                                        className={cn(
                                          "h-2 w-2 shrink-0 rounded-full",
                                          STATUS_DOT_CLASS[item.status],
                                        )}
                                      />
                                      <span
                                        className={
                                          STATUS_UI[item.status].textClass
                                        }
                                      >
                                        {STATUS_UI[item.status].label}
                                      </span>
                                    </span>
                                    <span className="truncate">
                                      {item.description ?? ""}
                                    </span>
                                  </div>
                                </div>
                              </button>

                              {isActive && (
                                <div className="mt-2 rounded-md border bg-background p-3">
                                  <ChecklistItemFormFields
                                    draft={draft}
                                    onDraftChange={(patch) =>
                                      applyChecklistPatch(item, patch)
                                    }
                                  />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </ScrollArea>

                    <div className="mt-2">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-3 text-left"
                        onClick={() => setAddingOpen((v) => !v)}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md border text-blue-600">
                          <Plus className="h-4 w-4" />
                        </div>
                        <div className="text-sm font-semibold text-blue-600">
                          ADD NEW ITEM
                        </div>
                      </button>
                      {addingOpen && (
                        <div className="mt-2 rounded-md border p-3">
                          <ChecklistItemFormFields
                            draft={newDraft}
                            onDraftChange={(patch) =>
                              setNewDraft((d) => ({ ...d, ...patch }))
                            }
                            footer={
                              <div className="flex justify-end pt-1">
                                <Button
                                  type="button"
                                  variant="default"
                                  disabled={!addFormValid}
                                  className="px-4 py-2"
                                  onClick={addNewItem}
                                >
                                  Add
                                </Button>
                              </div>
                            }
                          />
                        </div>
                      )}
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
