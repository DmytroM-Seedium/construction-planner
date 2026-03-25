import { FormEvent, useState } from "react";
import { taskRepository } from "@/entities/repositories/taskRepository";
import { useUiStore } from "@/shared/uiStore";

type Props = {
  userId: string;
  projectId: string;
};

export const TaskModal = ({ userId, projectId }: Props) => {
  const { taskModalOpen, taskModalMode, contextPosition, closeTaskModal } = useUiStore();
  const [title, setTitle] = useState("");

  if (!taskModalOpen) return null;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (taskModalMode === "create") {
      await taskRepository.createTask({
        userId,
        projectId,
        title,
        x: contextPosition?.x ?? 50,
        y: contextPosition?.y ?? 50
      });
    }
    closeTaskModal();
    setTitle("");
  };

  return (
    <div className="fixed inset-0 z-10 bg-black/30" onClick={closeTaskModal}>
      <form
        className="mx-auto mt-24 w-full max-w-md rounded bg-white p-4"
        onSubmit={save}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold">{taskModalMode === "create" ? "Create Task" : "Edit Task"}</h2>
        <input
          className="mb-3 w-full rounded border p-2"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task title"
          required
        />
        <button className="rounded bg-slate-800 px-3 py-2 text-white" type="submit">
          Save
        </button>
      </form>
    </div>
  );
};
