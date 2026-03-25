import { z } from "zod";
import { userSchema } from "../schemas/user.schema";

export const loginRequestSchema = z.object({
  name: z.string().min(1)
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema
});

export const jwtPayloadSchema = z.object({
  userId: z.string(),
  name: z.string()
});
