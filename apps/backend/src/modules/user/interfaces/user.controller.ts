import type { Logger } from "@/infrastructure/logger";
import { Hono } from "hono";
import type { User } from "../domain/user.entity";
import { createInviteUserRoute } from "./invite-user";

type UserControllerDeps = {
  getAllUsers: () => Promise<User[]>;
  getUserById: (id: string) => Promise<User | null>;
  inviteUser: (input: { organizationId: string; email: string }) => Promise<{
    success: boolean;
    error?: string;
  }>;
};

export const createUserController = (
  deps: UserControllerDeps,
  logger: Logger,
) => {
  const controller = new Hono();

  controller.get("/", async (c) => {
    const users = await deps.getAllUsers();
    logger.info(`Found ${users.length} users`);
    return c.json(users);
  });

  controller.get("/:id", async (c) => {
    const id = c.req.param("id");
    const user = await deps.getUserById(id);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    return c.json(user);
  });

  const inviteRoute = createInviteUserRoute(logger, deps.inviteUser);
  controller.post(inviteRoute.path, inviteRoute.handler);

  return controller;
};
