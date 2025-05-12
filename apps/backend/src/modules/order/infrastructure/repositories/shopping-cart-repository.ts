import type { DBClient } from "@/infrastructure/database";
import type { Logger } from "@/infrastructure/logger";
import { shoppingCartSchema } from "@/modules/order/domain/shopping-cart";
import type { ShoppingCartRepository } from "@/modules/order/domain/shopping-cart-repository.type";
import { sql } from "kysely";

/**
 * The SQL has the following assumptions:
 * - A user can have only one shopping cart opened at a time.
 * - Only the latest shopping cart can have the status "Opened". The others are "Closed".
 */
export const createShoppingCartRepository = (
  db: DBClient,
  logger: Logger,
): ShoppingCartRepository => ({
  findByUserIdOrCreate: async (userId: string) => {
    logger.info("findByUserId", { userId });
    const records = await db
      .selectFrom("shopping_cart as s")
      .innerJoin("shopping_cart_item as sci", "s.id", "sci.shopping_cart_id")
      .innerJoin("product as p", "sci.product_id", "p.id")
      .select([
        "s.id",
        "s.person_id",
        "s.status",
        "p.id as product_id",
        "p.product_name",
        (eb) => eb.fn.countAll().as("quantity"),
      ])
      .where("s.person_id", "=", userId)
      .orderBy("s.created_at", "desc")
      .groupBy(["s.id", "s.person_id", "s.status", "p.id", "p.product_name"])
      .execute();

    if (records.length === 0) {
      logger.info("No shopping cart found, creating new one", { userId });
      const createdCart = await db
        .insertInto("shopping_cart")
        .values({
          person_id: userId,
        })
        .returning(["id", "person_id", "status"])
        .executeTakeFirstOrThrow();

      return shoppingCartSchema.parse({
        ...createdCart,
        userId: createdCart.person_id,
        items: [],
      });
    }

    const shoppingCart = records[0];

    return shoppingCartSchema.parse({
      ...shoppingCart,
      userId: shoppingCart.person_id,
      items: records.map((record) => ({
        productId: record.product_id,
        productName: record.product_name,
        quantity: record.quantity,
      })),
    });
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
});
