/**
 * This file should not know about domain logic. It should only know about the database.
 */
import type { DBClient } from "@/infrastructure/database";
import type { Logger } from "@/infrastructure/logger";
import { sql } from "kysely";

/**
 * The SQL has the following assumptions:
 * - A user can have only one shopping cart opened at a time.
 * - Only the latest shopping cart can have the status "Opened". The others are "Closed".
 */
export type ShoppingCartRepository = ReturnType<
  typeof createShoppingCartRepository
>;
export const createShoppingCartRepository = (db: DBClient, logger: Logger) => ({
  findByUserIdOrCreate: async (userId: string) => {
    logger.info("findByUserId", { userId });
    const latestCartSubquery = db
      .selectFrom("shopping_cart")
      .selectAll()
      .where("person_id", "=", userId)
      .orderBy("created_at", "desc")
      .limit(1)
      .as("s");

    const cartItemsSubquery = db
      .selectFrom("shopping_cart_item")
      .select([
        "shopping_cart_id",
        "product_id",
        (eb) => eb.fn.countAll().as("quantity"),
      ])
      .groupBy(["shopping_cart_id", "product_id"])
      .as("sci");

    const records = await db
      .selectFrom(latestCartSubquery)
      .leftJoin(cartItemsSubquery, "s.id", "sci.shopping_cart_id")
      .leftJoin("product as p", "sci.product_id", "p.id")
      .select([
        "s.id",
        "s.person_id",
        "s.status",
        "p.id as product_id",
        "p.product_name",
        "sci.quantity",
      ])
      .execute();

    if (records.length > 0) return records;

    // If no shopping cart is found, create a new one
    logger.info("No shopping cart found, creating new one", { userId });
    const createdCart = await db
      .insertInto("shopping_cart")
      .values({
        person_id: userId,
      })
      .returning(["id", "person_id", "status"])
      .executeTakeFirstOrThrow();
    return [
      {
        ...createdCart,
        product_id: null,
        product_name: null,
        quantity: 0,
      },
    ];
  },
  addItem: async (userId: string, itemId: string) => {
    logger.info("addItem", { userId, itemId });
    const result = await db
      .insertInto("shopping_cart_item")
      .columns(["shopping_cart_id", "product_id"])
      .expression(
        db
          .selectFrom("shopping_cart")
          .select(["id as shopping_cart_id", sql`${itemId}`.as("product_id")])
          .where("status", "=", "Opened")
          .where("person_id", "=", userId),
      )
      .executeTakeFirstOrThrow();
    if ((result.numInsertedOrUpdatedRows ?? 0) === 0) {
      throw new Error("Shopping cart not found");
    }
    logger.info("end addItem", { result });
    return;
  },
  removeItem: async (userId: string, itemId: string) => {
    logger.info("removeItem", { userId, itemId });
    const subquery = db
      .selectFrom("shopping_cart_item as sci")
      .innerJoin("shopping_cart as sc", "sci.shopping_cart_id", "sc.id")
      .select("sci.id")
      .where("sci.product_id", "=", itemId)
      .where("sc.person_id", "=", userId)
      .where("sc.status", "=", "Opened")
      .orderBy("sci.created_at", "desc")
      .limit(1);

    const result = await db
      .deleteFrom("shopping_cart_item")
      .where("id", "=", subquery)
      .executeTakeFirstOrThrow();
    logger.info("end update", { result });
    return;
  },
  closeCart: async (userId: string) => {
    logger.info("closeCart", { userId });
    const result = await db
      .updateTable("shopping_cart")
      .set({ status: "Closed" })
      .where("person_id", "=", userId)
      .where("status", "=", "Opened")
      .executeTakeFirst();
    logger.info("end closeCart", { result });
    return;
  },
  findProducts: async () => {
    logger.info("findProducts");
    const result = await db.selectFrom("product").selectAll().execute();
    logger.info("end findProducts", { result });
    return result;
  },
});
