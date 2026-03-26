import { MouseEvent, useEffect } from "react";
import type { Task, TaskStatus } from "@construction-planner/shared/types";
import { clientPointToPercentPoint } from "@/features/plan/domain/coords";

export function PlanCanvas({
  imageUrl,
  tasks,
  taskStatusById,
  pinBgClass,
  onRightClickCreateAt,
  onOpenTask,
  previewPin,
}: {
  imageUrl: string;
  tasks: Task[];
  taskStatusById: Record<string, TaskStatus>;
  pinBgClass: Record<TaskStatus, string>;
  onRightClickCreateAt: (pos: { x: number; y: number }) => void;
  onOpenTask: (taskId: string) => void;
  previewPin?: { x: number; y: number } | null;
}) {
  useEffect(() => {
    return () => {
      // No-op cleanup; caller owns object URL revocation.
    };
  }, []);

  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pos = clientPointToPercentPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      containerRect: rect,
    });
    onRightClickCreateAt(pos);
  };

  return (
    <div className="rounded-md border bg-background p-2">
      <div className="relative mx-auto w-full" onContextMenu={onContextMenu}>
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

        {previewPin && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${previewPin.x}%`, top: `${previewPin.y}%` }}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900/80 shadow-sm ring-2 ring-background">
              <span className="h-2.5 w-2.5 rounded-full bg-white/70" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

