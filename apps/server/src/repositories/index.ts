import fs from "node:fs";
import path from "node:path";
import Datastore from "nedb";
import type { ChecklistItem, Project, Task, User } from "@construction-planner/shared/types";
import { BaseRepository } from "./baseRepository.js";
import { config } from "../config.js";

const createStore = <T>(fileName: string): Datastore<T> => {
  fs.mkdirSync(config.dataDir, { recursive: true });
  return new Datastore<T>({
    filename: path.join(config.dataDir, fileName),
    autoload: true
  });
};

export type RepoBundle = {
  users: BaseRepository<User>;
  projects: BaseRepository<Project>;
  tasks: BaseRepository<Task>;
  checklistItems: BaseRepository<ChecklistItem>;
};

export const buildRepositories = (): RepoBundle => ({
  users: new BaseRepository<User>(createStore<User>("users.db")),
  projects: new BaseRepository<Project>(createStore<Project>("projects.db")),
  tasks: new BaseRepository<Task>(createStore<Task>("tasks.db")),
  checklistItems: new BaseRepository<ChecklistItem>(createStore<ChecklistItem>("checklist-items.db"))
});
