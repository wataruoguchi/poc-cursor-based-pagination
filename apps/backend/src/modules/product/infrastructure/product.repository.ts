import type { DBClient } from "@/infrastructure/database";
import type { Logger } from "@/infrastructure/logger";
import { createPaginatedQuery } from "@/shared/utils/pagination/repository";

export type ProductRepository = ReturnType<typeof createProductRepository>;
export const createProductRepository = (db: DBClient, logger: Logger) => {
  return {
    findProducts: async () => {
      logger.info("findProducts");
      const result = await db.selectFrom("product").selectAll().execute();
      return result;
    },
    findProductsPaginated: () => {
      return createPaginatedQuery(
        logger,
        db.selectFrom("product"),
      ).withTextSearchableColumns(["product_name"]);
    },
  };
};
