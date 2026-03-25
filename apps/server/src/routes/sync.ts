import type { FastifyInstance } from "fastify";
import { syncPullQuerySchema, syncPushBodySchema } from "@construction-planner/shared/sync";
import { SyncService } from "../services/syncService.js";

export const registerSyncRoutes = (fastify: FastifyInstance): void => {
  const service = new SyncService(fastify.repos);

  fastify.post("/sync/push", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parsed = syncPushBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: "Invalid sync push payload" });
    }

    const result = await service.push(parsed.data);
    return reply.send(result);
  });

  fastify.get("/sync/pull", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parsed = syncPullQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ message: "Invalid sync pull query" });
    }

    const result = await service.pull(parsed.data.userId, parsed.data.since);
    return reply.send(result);
  });
};
