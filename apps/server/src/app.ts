import "./utils/utilLegacyPolyfill.ts";
import fs from "node:fs";
import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { config } from "./config.js";
import { buildRepositories } from "./repositories/index.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerSyncRoutes } from "./routes/sync.js";
import { registerProjectRoutes } from "./routes/projects.js";

export const buildApp = () => {
  const app = Fastify({ logger: true });
  const repos = buildRepositories();
  app.decorate("repos", repos);

  app.register(cors, { origin: true });
  app.register(jwt, { secret: config.jwtSecret });
  app.register(multipart);

  const uploadsPath = path.join(config.uploadsDir);
  fs.mkdirSync(path.join(uploadsPath, "plans"), { recursive: true });
  app.register(fastifyStatic, {
    root: uploadsPath,
    prefix: "/uploads/",
  });

  app.decorate("authenticate", async (request: unknown, reply: unknown) => {
    try {
      await (request as { jwtVerify: () => Promise<unknown> }).jwtVerify();
    } catch {
      (reply as { status: (code: number) => { send: (body: unknown) => unknown } })
        .status(401)
        .send({ message: "Unauthorized" });
    }
  });

  registerAuthRoutes(app);
  registerSyncRoutes(app);
  registerProjectRoutes(app);

  return app;
};
