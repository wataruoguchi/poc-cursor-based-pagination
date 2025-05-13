/**
 * This file should not know about domain logic. It should only know about the database.
 */
import type { DBClient } from "@/infrastructure/database";
import type { Logger } from "@/infrastructure/logger";

export type UserRepository = ReturnType<typeof createUserRepository>;
export const createUserRepository = (db: DBClient, logger: Logger) => ({
  findAll: async function findAll() {
    logger.info("Repository: Getting all users");
    return await db.selectFrom("person").selectAll().execute();
  },
  findById: async function findById(id: string) {
    logger.info("Repository: Getting user by id", { id });
    return await db
      .selectFrom("person")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst();
  },
});
