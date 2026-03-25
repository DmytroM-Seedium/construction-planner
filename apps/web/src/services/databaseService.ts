import {
  addRxPlugin,
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
} from "rxdb";
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

export type DbCollections = {
  users: RxCollection<User>;
  projects: RxCollection<Project>;
  tasks: RxCollection<Task>;
  checklistItems: RxCollection<ChecklistItem>;
};

let databasePromise: Promise<RxDatabase<DbCollections>> | null = null;

export const getDatabase = async (): Promise<RxDatabase<DbCollections>> => {
  if (!databasePromise) {
    databasePromise = createRxDatabase<DbCollections>({
      name: "construction-planner",
      storage: wrappedValidateAjvStorage({ storage: getRxStorageDexie() }),
      multiInstance: false,
    }).then(async (db) => {
      await db.addCollections(collectionSchemas);
      return db;
    });
  }
  return databasePromise;
};
