import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { Project } from "@construction-planner/shared/types";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const extForMime = (mime: string): string | null => {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return null;
  }
};

export const registerProjectRoutes = (fastify: FastifyInstance): void => {
  fastify.post(
    "/projects/:projectId/plan-image",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ message: "No file provided" });
      }

      const mime = (file.mimetype || "").toLowerCase();
      if (!ALLOWED_MIME.has(mime)) {
        return reply.status(400).send({
          message: "Only JPEG, PNG, or WebP images are allowed.",
        });
      }

      const ext = extForMime(mime);
      if (!ext) {
        return reply.status(400).send({
          message: "Only JPEG, PNG, or WebP images are allowed.",
        });
      }

      const { projectId } = request.params as { projectId: string };
      const uploadsPlans = path.join(process.cwd(), "uploads", "plans");
      await fs.mkdir(uploadsPlans, { recursive: true });

      const entries = await fs.readdir(uploadsPlans);
      for (const name of entries) {
        if (name.startsWith(`${projectId}.`)) {
          await fs.unlink(path.join(uploadsPlans, name));
        }
      }

      const targetPath = path.join(uploadsPlans, `${projectId}${ext}`);
      const buffer = await file.toBuffer();
      await fs.writeFile(targetPath, buffer);

      const fields = (file as unknown as {
        fields?: Record<string, { value?: unknown }>;
      }).fields;
      const field = fields?.imageUpdatedAt;
      const rawImageUpdatedAt =
        typeof field?.value === "string" ? Number(field.value) : undefined;
      const imageUpdatedAt =
        typeof rawImageUpdatedAt === "number" && Number.isFinite(rawImageUpdatedAt)
          ? rawImageUpdatedAt
          : Date.now();

      const authUserIdRaw = (request as unknown as { user?: { userId?: unknown } }).user?.userId;
      const authUserId = typeof authUserIdRaw === "string" ? authUserIdRaw : undefined;
      const existing = await fastify.repos.projects.findById(projectId);
      const baseNow = Date.now();

      const next: Project = {
        id: projectId,
        userId: existing?.userId ?? authUserId ?? "",
        name: existing?.name ?? "Untitled",
        createdAt: existing?.createdAt ?? imageUpdatedAt,
        updatedAt: Math.max(existing?.updatedAt ?? 0, imageUpdatedAt, baseNow),
        isDeleted: existing?.isDeleted ?? false,
        hasImage: true,
        imageUpdatedAt,
        imageSyncedAt: imageUpdatedAt,
      };
      await fastify.repos.projects.upsert(next);

      return reply.send({
        hasImage: true,
        imageUpdatedAt,
        imageSyncedAt: imageUpdatedAt,
        url: `/uploads/plans/${projectId}${ext}`,
      });
    },
  );
};
