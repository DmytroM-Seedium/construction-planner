import dotenv from "dotenv";

dotenv.config();

const parsePort = (rawPort: string | undefined): number => {
  if (!rawPort) return 4000;
  const parsedPort = Number(rawPort);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }
  return parsedPort;
};

const readJwtSecret = (rawSecret: string | undefined): string => {
  if (!rawSecret || !rawSecret.trim()) {
    throw new Error("JWT_SECRET is required");
  }
  return rawSecret;
};

export const env = Object.freeze({
  port: parsePort(process.env.PORT),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: readJwtSecret(process.env.JWT_SECRET)
});
