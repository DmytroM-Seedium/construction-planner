import path from "node:path";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "dev-construction-planner-secret",
  dataDir: path.resolve(process.cwd(), "data"),
  uploadsDir: path.resolve(process.cwd(), "uploads")
};
