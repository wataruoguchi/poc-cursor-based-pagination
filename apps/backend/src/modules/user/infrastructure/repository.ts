import type { DBClient } from "../../../infrastructure/database";
import type { Logger } from "../../../infrastructure/logger";
import { userSchema } from "../domain/entity";
import type { UserRepository } from "../domain/repository.type";

/**
 * Infrastructure layer should not have any domain knowledge, except for the entity schema. It should not know about domain logic.
 */
export const createUserRepository = (
  db: DBClient,
  logger: Logger,
): UserRepository => ({
  findAll: async function findAll() {
    logger.info("Repository: Getting all users");
    const users = await db.selectFrom("person").selectAll().execute();
    const userEntities = users.map((user) =>
      userSchema.parse({ ...user, createdAt: user.created_at }),
    );
    return userEntities;
  },
});
