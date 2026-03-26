import { nanoid } from "nanoid";
import type { AuthResponse } from "@construction-planner/shared/types";
import { api } from "@/shared/http";
import { authUserToRecord } from "@/features/auth/mapAuthUser";
import { userRepository } from "@/features/users/data/user.repository";
import { useAuthStore } from "@/features/auth/store/auth.store";

export const loginByName = async (name: string): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>("/auth/login", { name });
    useAuthStore.getState().setSession(response.token, response.user.id, response.user.name);
    await userRepository.upsertUser(authUserToRecord(response.user));
    return response;
  } catch (error) {
    const isNetworkError =
      error instanceof TypeError ||
      (error instanceof Error &&
        /failed to fetch|networkerror|load failed/i.test(error.message));

    if (!isNetworkError) throw error;

    // Offline fallback: if this user already exists in RxDB,
    // allow navigation without requiring a server-issued JWT.
    const normalizedName = name.trim();
    const existing = await userRepository.findByName(normalizedName);
    if (!existing) {
      const ts = Date.now();
      const id = nanoid();
      const localUser = {
        id,
        userId: id,
        name: normalizedName,
        createdAt: ts,
        updatedAt: ts,
        isDeleted: false,
      };
      await userRepository.upsertUser(localUser);
      useAuthStore.getState().setSession("", localUser.id, localUser.name);
      return { token: "", user: localUser };
    }

    useAuthStore.getState().setSession("", existing.id, existing.name);
    return {
      token: "",
      user: existing,
    };
  }
};
