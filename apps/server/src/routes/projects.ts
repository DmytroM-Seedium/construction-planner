import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";

export const registerProjectRoutes = (fastify: FastifyInstance): void => {
  fastify.post(
    "/projects/:projectId/plan-image",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ message: "No file provided" });
      }

      const { projectId } = request.params as { projectId: string };
      const uploadsPlans = path.join(process.cwd(), "uploads", "plans");
      await fs.mkdir(uploadsPlans, { recursive: true });
      const targetPath = path.join(uploadsPlans, `${projectId}.png`);

      const buffer = await file.toBuffer();
      await fs.writeFile(targetPath, buffer);

      return reply.send({
        hasImage: true,
        imageUpdatedAt: Date.now(),
        url: `/uploads/plans/${projectId}.png`
      });
    }
  );
};
