import type { FastifyInstance } from "fastify";
import { loginRequestSchema } from "@construction-planner/shared/api";
import { AuthService } from "../services/authService.js";

export const registerAuthRoutes = (fastify: FastifyInstance): void => {
  const service = new AuthService(fastify.repos, fastify);

  fastify.post("/auth/login", async (request, reply) => {
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: "Invalid login payload" });
    }

    const result = await service.login(parsed.data);
    return reply.send(result);
  });
};
