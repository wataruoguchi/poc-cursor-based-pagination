import type { DBClient } from "@/infrastructure/database";
import type { Logger } from "@/infrastructure/logger";

export type OrganizationRepository = ReturnType<
  typeof createOrganizationRepository
>;
export const createOrganizationRepository = (db: DBClient, logger: Logger) => ({
  findAll: async function findAll() {
    logger.info("Repository: Getting all organizations");
    return await db.selectFrom("organization").selectAll().execute();
  },
});
