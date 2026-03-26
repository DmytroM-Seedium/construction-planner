import {
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  type RxCollection,
  type RxDatabase,
} from "rxdb";
import { RxDBAttachmentsPlugin } from "rxdb/plugins/attachments";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";
import type {
  ChecklistItem,
  Project,
  Task,
  User,
} from "@construction-planner/shared/types";
import { collectionSchemas } from "@/entities/db/schemas";

addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBAttachmentsPlugin);

export type DbCollections = {
  users: RxCollection<User>;
  projects: RxCollection<Project>;
  tasks: RxCollection<Task>;
  checklistItems: RxCollection<ChecklistItem>;
};

let databasePromise: Promise<RxDatabase<DbCollections>> | null = null;

export const getDatabase = async (): Promise<RxDatabase<DbCollections>> => {
  if (!databasePromise) {
    const name = "construction-planner";
    const storage = wrappedValidateAjvStorage({ storage: getRxStorageDexie() });

    const create = async () => {
      const db = await createRxDatabase<DbCollections>({
        name,
        storage,
        multiInstance: false,
      });
      await db.addCollections(collectionSchemas);
      return db;
    };

    databasePromise = create().catch(async (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as any)?.code as string | undefined;
      if (code === "DB6" || message.includes("DB6")) {
        await removeRxDatabase(name, storage);
        return create();
      }
      throw error;
    });
  }
  return databasePromise;
};
