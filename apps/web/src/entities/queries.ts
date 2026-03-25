import { getDatabase } from "@/services/databaseService";

export const queries = {
  async projectsByUser(userId: string) {
    const db = await getDatabase();
    return db.projects.find({
      selector: {
        userId,
        isDeleted: { $ne: true },
      },
      sort: [{ updatedAt: "desc" }],
    });
  },
  async tasksByProject(userId: string, projectId: string) {
    const db = await getDatabase();
    return db.tasks.find({
      selector: {
        userId,
        projectId,
        isDeleted: { $ne: true },
      },
      sort: [{ updatedAt: "desc" }],
    });
  },
  async checklistItemsByTask(userId: string, taskId: string) {
    const db = await getDatabase();
    return db.checklistItems.find({
      selector: {
        userId,
        taskId,
        isDeleted: { $ne: true },
      },
      sort: [{ updatedAt: "desc" }],
    });
  },
};
