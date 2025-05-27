import type { DBClient } from "@/infrastructure/database";
import type { Logger } from "@/infrastructure/logger";
import {
  type CursorData,
  createPaginatedRepository,
} from "@/shared/utils/pagination";
import type { DB } from "kysely-codegen";

export type ProductRepository = ReturnType<typeof createProductRepository>;
export const createProductRepository = (db: DBClient, logger: Logger) => {
  return {
    findProducts: async () => {
      logger.info("findProducts");
      const result = await db.selectFrom("product").selectAll().execute();
      return result;
    },
    findProductsPaginated: async (cursor: CursorData | null) => {
      const { items, totalCount } = await createPaginatedRepository<
        DB["product"]
      >(db, logger, "product", {
        defaultLimit: 10,
        defaultSortBy: "id",
        defaultSortOrder: "asc",
        searchColumn: "product_name",
      }).findPaginated(cursor);
      return {
        items: items.map((item: DB["product"]) => ({
          id: String(item.id),
          product_name: String(item.product_name),
          created_at: new Date(String(item.created_at)),
        })),
        totalCount,
      };
    },
  };
};
