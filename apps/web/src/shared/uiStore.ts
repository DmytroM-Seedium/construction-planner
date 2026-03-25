import { create } from "zustand";

type UiState = {
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  taskModalOpen: boolean;
  taskModalMode: "create" | "edit";
  contextPosition: { x: number; y: number } | null;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  openTaskModal: (mode: "create" | "edit", position?: { x: number; y: number }) => void;
  closeTaskModal: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedProjectId: null,
  selectedTaskId: null,
  taskModalOpen: false,
  taskModalMode: "create",
  contextPosition: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  openTaskModal: (mode, position) => set({ taskModalOpen: true, taskModalMode: mode, contextPosition: position ?? null }),
  closeTaskModal: () => set({ taskModalOpen: false })
}));
