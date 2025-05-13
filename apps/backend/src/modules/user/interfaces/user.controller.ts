import type { Logger } from "@/infrastructure/logger";
import { Hono } from "hono";
import type { UserUseCases } from "../application/user.usecases";

export const createUserController = (
  useCases: Pick<UserUseCases, "getAllUsers">,
  logger: Logger,
) => {
  const app = new Hono();

  app.get("/", async (c) => {
    const users = await useCases.getAllUsers();
    logger.info(`Found ${users.length} users`);
    return c.json(users);
  });

  return app;
};
