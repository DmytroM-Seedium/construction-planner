import type { User } from "@construction-planner/shared/types";
import { getDbClient } from "@/core/infrastructure/db-client";

/** Point all local rows at the server canonical user id and replace the local user document. */
export async function remapLocalUserIdToServer(
  localUserId: string,
  serverUser: User,
): Promise<void> {
  if (localUserId === serverUser.id) return;

  const db = await getDbClient();
  const ts = Date.now();

  for (const collection of [db.tasks, db.projects, db.checklistItems] as const) {
    const docs = await collection.find({ selector: { userId: localUserId } }).exec();
    for (const doc of docs) {
      await doc.incrementalPatch({ userId: serverUser.id, updatedAt: ts });
    }
  }

  const oldUserDoc = await db.users.findOne(localUserId).exec();
  if (oldUserDoc) {
    await oldUserDoc.remove();
  }
  await db.users.upsert(serverUser);
}

