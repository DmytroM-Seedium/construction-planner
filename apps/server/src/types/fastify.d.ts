import type { BaseRepository } from "../repositories/baseRepository.js";
import type { ChecklistItem, Project, Task, User } from "@construction-planner/shared/types";

declare module "fastify" {
  interface FastifyInstance {
    repos: {
      users: BaseRepository<User>;
      projects: BaseRepository<Project>;
      tasks: BaseRepository<Task>;
      checklistItems: BaseRepository<ChecklistItem>;
    };
    authenticate: (request: unknown, reply: unknown) => Promise<void>;
  }
}
