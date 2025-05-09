import { Hono } from "hono";
import type { Logger } from "../../../infrastructure/logger";
import { createGetAllUsersUseCase } from "../application/use-cases";
import type { UserRepository } from "../domain/repository.type";

export const createUserController = (
  userRepository: UserRepository,
  logger: Logger,
) => {
  const app = new Hono();

  app.get("/users", async (c) => {
    logger.info("Getting all users");
    const users = await createGetAllUsersUseCase(
      userRepository,
      logger,
    ).execute();
    logger.info(`Found ${users.length} users`);
    return c.json(users);
  });

  return app;
};
