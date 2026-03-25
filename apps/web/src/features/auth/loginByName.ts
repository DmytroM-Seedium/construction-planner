import type { AuthResponse, User } from "@construction-planner/shared/types";
import { api } from "@/shared/http";
import { localRepository } from "@/entities/repositories/localRepository";
import { useTaskStore } from "@/store/useTaskStore";

/** RxDB only allows schema fields — API may send extras (e.g. `_id`). */
const toUserRecord = (raw: AuthResponse["user"]): User => ({
  id: raw.id,
  userId: raw.userId,
  name: raw.name,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  isDeleted: raw.isDeleted,
});

export const loginByName = async (name: string): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>("/auth/login", { name });
    console.log("response", response);
    useTaskStore.getState().setSession(response.token, response.user.id);
    console.log("set in session store");
    await localRepository.upsertUser(toUserRecord(response.user));
    console.log("upserted user");
    return response;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};
