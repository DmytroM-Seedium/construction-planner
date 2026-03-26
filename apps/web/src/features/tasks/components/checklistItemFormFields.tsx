import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { TaskStatus } from "@construction-planner/shared/types";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  History,
  Hourglass,
  Square,
} from "lucide-react";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/lib/utils";

export type ChecklistDraft = {
  title: string;
  description: string;
  status: TaskStatus;
};

type StatusUi = {
  label: string;
  ticketText: string;
  textClass: string;
  icon: (className?: string) => ReactElement;
};

/** Colored dot for collapsed status label rows (matches status theme). */
export const STATUS_DOT_CLASS: Record<TaskStatus, string> = {
  NO_STARTED: "bg-slate-400",
  IN_PROGRESS: "bg-amber-400",
  BLOCKED: "bg-red-500",
  AWAITING_CHECK: "bg-purple-500",
  DONE: "bg-emerald-500",
};

export const STATUS_UI: Record<TaskStatus, StatusUi> = {
  NO_STARTED: {
    label: "Not started",
    ticketText: "Ticket is not started",
    textClass: "text-slate-500",
    icon: (className) => (
      <Square className={cn("h-5 w-5 text-slate-400", className)} />
    ),
  },
  IN_PROGRESS: {
    label: "In progress",
    ticketText: "Ticket is in progress",
    textClass: "text-amber-600",
    icon: (className) => (
      <History className={cn("h-5 w-5 text-amber-600", className)} />
    ),
  },
  BLOCKED: {
    label: "Blocked",
    ticketText: "Ticket progress is blocked",
    textClass: "text-red-600",
    icon: (className) => (
      <AlertTriangle className={cn("h-5 w-5 text-red-600", className)} />
    ),
  },
  AWAITING_CHECK: {
    label: "Final Check awaiting",
    ticketText: "Ticket is awaiting final check",
    textClass: "text-purple-600",
    icon: (className) => (
      <Hourglass className={cn("h-5 w-5 text-purple-600", className)} />
    ),
  },
  DONE: {
    label: "Done",
    ticketText: "Ticket is done",
    textClass: "text-emerald-600",
    icon: (className) => (
      <CheckCircle2 className={cn("h-5 w-5 text-emerald-600", className)} />
    ),
  },
};

export function StatusSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: TaskStatus;
  onChange: (next: TaskStatus) => void;
  disabled?: boolean;
  id?: string;
}) {
  const triggerClass = cn(
    "flex w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm",
    "disabled:cursor-not-allowed disabled:opacity-50",
  );

  const triggerInner = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        {STATUS_UI[value].icon("h-4 w-4")}
        <span className="truncate">{STATUS_UI[value].label}</span>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>();

  useLayoutEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTriggerWidth(el.offsetWidth));
    ro.observe(el);
    setTriggerWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  if (disabled) {
    return (
      <div className="relative">
        <div id={id} className={triggerClass} aria-disabled>
          {triggerInner}
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button ref={triggerRef} id={id} type="button" className={triggerClass}>
          {triggerInner}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={triggerWidth ? { width: triggerWidth } : undefined}
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="max-h-64 overflow-y-auto py-1">
          {(Object.keys(STATUS_UI) as TaskStatus[]).map((status) => (
            <li key={status}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                  status === value && "bg-accent",
                )}
                onClick={() => {
                  onChange(status);
                  setOpen(false);
                }}
              >
                {STATUS_UI[status].icon("h-4 w-4")}
                <span className="truncate">{STATUS_UI[status].label}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function ChecklistItemFormFields({
  draft,
  onDraftChange,
  footer,
}: {
  draft: ChecklistDraft;
  onDraftChange: (patch: Partial<ChecklistDraft>) => void;
  footer?: ReactNode;
}) {
  const id = useId();
  const nameId = `${id}-name`;
  const statusId = `${id}-status`;
  const descriptionId = `${id}-description`;

  return (
    <div className="grid gap-3">
      <Field>
        <FieldLabel htmlFor={nameId}>Name</FieldLabel>
        <Input
          id={nameId}
          value={draft.title}
          onChange={(e) => onDraftChange({ title: e.target.value })}
          placeholder="Item name"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={statusId}>Status</FieldLabel>
        <div>
          <StatusSelect
            id={statusId}
            value={draft.status}
            onChange={(status) => onDraftChange({ status })}
          />
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
        <Input
          id={descriptionId}
          value={draft.description}
          onChange={(e) => onDraftChange({ description: e.target.value })}
          placeholder="Item description"
        />
      </Field>
      {footer}
    </div>
  );
}

