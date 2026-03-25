import { z } from "zod";
import { authResponseSchema, jwtPayloadSchema, loginRequestSchema } from "../api/auth.schema";

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
