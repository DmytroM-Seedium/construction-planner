import type { Project } from "@construction-planner/shared/types";
import { nanoid } from "nanoid";
import type { RxQuery } from "rxdb";
import { projectImageService } from "@/features/project-image/projectImageService";
import { taskRepository } from "@/features/tasks/data/task.repository";
import { requestSync } from "@/core/infrastructure/sync/syncEngine";
import { getDbClient } from "@/core/infrastructure/db-client";

const now = () => Date.now();

const projectsQuery = async (userId: string): Promise<RxQuery<Project>> => {
  const db = await getDbClient();
  return db.projects.find({
    selector: { userId, isDeleted: { $ne: true } },
    sort: [{ updatedAt: "desc" }],
  });
};

const cacheKey = (userId: string) => userId;

export class ProjectRepository {
  private readonly projectListCache = new Map<string, Project[]>();
  private static readonly EMPTY: Project[] = [];

  getProjectsSnapshot(userId: string): Project[] {
    return this.projectListCache.get(cacheKey(userId)) ?? ProjectRepository.EMPTY;
  }

  async upsertProject(project: Project): Promise<void> {
    const db = await getDbClient();
    await db.projects.upsert(project);
    requestSync();
  }

  async createProject(userId: string, name: string): Promise<Project> {
    const timestamp = now();
    const project: Project = {
      id: nanoid(),
      userId,
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
      hasImage: false,
      imageSyncedAt: 0,
    };

    await this.upsertProject(project);
    return project;
  }

  async softDeleteProject(userId: string, projectId: string): Promise<void> {
    const db = await getDbClient();
    const tasksQuery = await db.tasks.find({
      selector: { userId, projectId, isDeleted: { $ne: true } },
    });
    const taskDocs = await tasksQuery.exec();
    for (const taskDoc of taskDocs) {
      const task = taskDoc.toMutableJSON();
      await taskRepository.softDeleteTask(userId, task.id as string);
    }

    await projectImageService.removePlanAttachment(projectId);

    const projectDoc = await db.projects.findOne(projectId).exec();
    if (!projectDoc) return;
    const project = projectDoc.toMutableJSON() as Project;
    if (project.userId !== userId) return;
    await this.upsertProject({
      ...project,
      isDeleted: true,
      updatedAt: now(),
    });
  }

  /**
   * Subscribe to project list changes for a user.
   * Returns an unsubscribe function.
   */
  subscribeToProjects(userId: string, listener: (projects: Project[]) => void): () => void {
    const key = cacheKey(userId);
    let cancelled = false;
    let unsubscribeRx = () => {};

    projectsQuery(userId).then((query) => {
      if (cancelled) return;
      const sub = query.$.subscribe((result) => {
        const projects = (result ?? []) as Project[];
        this.projectListCache.set(key, projects);
        listener(projects);
      });
      unsubscribeRx = () => sub.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribeRx();
      this.projectListCache.delete(key);
    };
  }
}

export const projectRepository = new ProjectRepository();

