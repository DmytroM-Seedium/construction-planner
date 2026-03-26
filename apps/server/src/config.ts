import path from "node:path";
import { env } from "./config/env.js";

export const config = {
  port: env.port,
  host: env.host,
  jwtSecret: env.jwtSecret,
  dataDir: path.resolve(process.cwd(), "data"),
  uploadsDir: path.resolve(process.cwd(), "uploads")
};
