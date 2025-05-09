import type { DBClient } from "../../../infrastructure/database";
import type { Logger } from "../../../infrastructure/logger";
import { userSchema } from "../domain/entity";
import type { UserRepository } from "../domain/repository.type";

export const createUserRepository = (
  db: DBClient,
  logger: Logger,
): UserRepository => ({
  findAll: async function findAll() {
    logger.info("Repository: Getting all users");
    const users = await db.selectFrom("user").selectAll().execute();
    return users.map((user) =>
      userSchema.parse({ ...user, createdAt: user.created_at }),
    );
  },
});
