import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { taskRepository } from "@/entities/repositories/taskRepository";

const LEGACY_TOKEN = "cp_token";
const LEGACY_USER_ID = "cp_user_id";

type TaskStore = {
  token: string | null;
  userId: string | null;
  userName: string | null;
  setSession: (token: string, userId: string, userName: string | null) => void;
  clearSession: () => void;
  taskRepository: typeof taskRepository;
};

const legacyAwareStorage: Storage = {
  get length() {
    return localStorage.length;
  },
  clear: () => localStorage.clear(),
  getItem: (key: string) => {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
    if (key !== "cp-task-store") return null;
    const legacyToken = localStorage.getItem(LEGACY_TOKEN);
    const legacyUserId = localStorage.getItem(LEGACY_USER_ID);
    if (legacyToken && legacyUserId) {
      return JSON.stringify({
        state: { token: legacyToken, userId: legacyUserId, userName: null },
        version: 0,
      });
    }
    return null;
  },
  key: (index: number) => localStorage.key(index),
  removeItem: (key: string) => localStorage.removeItem(key),
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value);
    try {
      const parsed = JSON.parse(value) as {
        state?: { token?: string | null; userId?: string | null };
      };
      const t = parsed.state?.token;
      const u = parsed.state?.userId;
      if (t && u) {
        localStorage.setItem(LEGACY_TOKEN, t);
        localStorage.setItem(LEGACY_USER_ID, u);
      }
    } catch {
      console.error(
        "Failed to parse JSON in legacyAwareStorage",
        value.slice(0, 100),
      );
    }
  },
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      userName: null,
      taskRepository,
      setSession: (token, userId, userName) => set({ token, userId, userName }),
      clearSession: () => {
        localStorage.removeItem(LEGACY_TOKEN);
        localStorage.removeItem(LEGACY_USER_ID);
        set({ token: null, userId: null, userName: null });
      },
    }),
    {
      name: "cp-task-store",
      storage: createJSONStorage(() => legacyAwareStorage),
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        userName: state.userName,
      }),
    },
  ),
);
