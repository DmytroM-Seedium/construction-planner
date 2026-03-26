import type { AuthResponse, User } from "@construction-planner/shared/types";

/** RxDB only allows schema fields — API may send extras (e.g. `_id`). */
export const authUserToRecord = (raw: AuthResponse["user"]): User => ({
  id: raw.id,
  userId: raw.userId,
  name: raw.name,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  isDeleted: raw.isDeleted
});
