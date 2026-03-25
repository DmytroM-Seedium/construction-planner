import { nanoid } from "nanoid";
import type {
  ChecklistItem,
  Project,
  User,
} from "@construction-planner/shared/types";
import { getDatabase } from "@/services/databaseService";

const now = () => Date.now();

export const localRepository = {
  async upsertUser(user: User) {
    console.log("upserting user", user);
    const db = await getDatabase();
    console.log("get DB");
    await db.users.upsert(user);
    console.log("upserted user - END");
  },
  async upsertProject(project: Project) {
    const db = await getDatabase();
    await db.projects.upsert(project);
  },
  async upsertChecklistItem(item: ChecklistItem) {
    const db = await getDatabase();
    await db.checklistItems.upsert(item);
  },
  async createProject(userId: string, name: string) {
    const timestamp = now();
    const project: Project = {
      id: nanoid(),
      userId,
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
      hasImage: false,
    };
    await this.upsertProject(project);
    return project;
  },
  async createChecklistItem(
    data: Omit<ChecklistItem, "id" | "createdAt" | "updatedAt" | "isDeleted">,
  ) {
    const timestamp = now();
    const item: ChecklistItem = {
      ...data,
      id: nanoid(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    };
    await this.upsertChecklistItem(item);
    return item;
  },
  async getProjects(userId: string) {
    const db = await getDatabase();
    return db.projects.find({ selector: { userId } }).exec();
  },
};
