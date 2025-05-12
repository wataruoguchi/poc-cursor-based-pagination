import type { DBClient } from "@/infrastructure/database";
import type { Logger } from "@/infrastructure/logger";
import { userSchema } from "@/modules/user/domain/entity";
import type { UserRepository } from "@/modules/user/domain/repository.type";

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
  findById: async function findById(id: string) {
    logger.info("Repository: Getting user by id", { id });
    const user = await db
      .selectFrom("person")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow();
    return user
      ? userSchema.parse({ ...user, createdAt: user.created_at })
      : null;
  },
});
