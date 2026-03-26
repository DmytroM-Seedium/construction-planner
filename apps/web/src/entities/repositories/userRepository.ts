import type { User } from "@construction-planner/shared/types";
import { requestSync } from "@/processes/sync/syncEngine";
import { getDatabase } from "@/services/databaseService";

const normalizeName = (name: string) => name.trim();

export const userRepository = {
  async upsertUser(user: User) {
    const db = await getDatabase();
    await db.users.upsert(user);
    requestSync();
  },

  async findById(id: string): Promise<User | null> {
    const db = await getDatabase();
    const doc = await db.users.findOne(id).exec();
    return (doc ?? null) as unknown as User | null;
  },

  async findByName(name: string): Promise<User | null> {
    const db = await getDatabase();
    const normalized = normalizeName(name);
    const docs = await db.users
      .find({
        selector: { name: normalized, isDeleted: { $ne: true } },
        sort: [{ updatedAt: "desc" }],
      })
      .exec();
    return (docs[0] ?? null) as unknown as User | null;
  },
};

