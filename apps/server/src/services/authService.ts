import { nanoid } from "nanoid";
import type { FastifyInstance } from "fastify";
import type { LoginRequest, User } from "@construction-planner/shared/types";
import type { RepoBundle } from "../repositories/index.js";

export class AuthService {
  constructor(
    private readonly repos: RepoBundle,
    private readonly fastify: FastifyInstance,
  ) {}

  async login(input: LoginRequest): Promise<{ token: string; user: User }> {
    const users = await this.repos.users.findByName(input.name.trim());
    let user = users.find(
      (item) => item.name.toLowerCase() === input.name.trim().toLowerCase(),
    );

    if (!user) {
      user = {
        id: nanoid(),
        userId: "",
        name: input.name.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      };
      user.userId = user.id;
      await this.repos.users.upsert(user);
    }

    const token = await this.fastify.jwt.sign({
      userId: user.id,
      name: user.name,
    });
    return { token, user: { ...user, userId: user.id } };
  }
}
