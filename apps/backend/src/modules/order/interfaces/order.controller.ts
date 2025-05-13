import type { Logger } from "@/infrastructure/logger";
import { Hono } from "hono";
import type { OrderUseCases } from "../application/order.usecases";

export const createOrderController = (
  useCases: OrderUseCases,
  logger: Logger,
) => {
  const app = new Hono();

  app.get("/shopping-cart", async (c) => {
    logger.info("Getting shopping cart");
    const userId: string = c.req.header("X-User-Id") ?? "user-123"; // TODO: In real world, we want to get the user id from the Authorization header
    const shoppingCart = await useCases.findShoppingCartByUserId(userId);
    shoppingCart
      ? logger.info(`Found shopping cart ${shoppingCart.id}`)
      : logger.info("No shopping cart found");
    return c.json(shoppingCart);
  });

  app.post("/shopping-cart/items/:itemId", async (c) => {
    logger.info("Adding item to shopping cart");
    const userId: string = c.req.header("X-User-Id") ?? "user-123"; // TODO: In real world, we want to get the user id from the Authorization header
    const itemId: string = c.req.param("itemId");
    const shoppingCart = await useCases.addItemToCart(userId, itemId);
    return c.json(shoppingCart);
  });

  app.delete("/shopping-cart/items/:itemId", async (c) => {
    logger.info("Removing item from shopping cart");
    const userId: string = c.req.header("X-User-Id") ?? "user-123"; // TODO: In real world, we want to get the user id from the Authorization header
    const itemId: string = c.req.param("itemId");
    const shoppingCart = await useCases.removeItemFromCart(userId, itemId);
    return c.json(shoppingCart);
  });

  app.put("/shopping-cart/close", async (c) => {
    logger.info("Order placed. Closing shopping cart");
    const userId: string = c.req.header("X-User-Id") ?? "user-123"; // TODO: In real world, we want to get the user id from the Authorization header
    const shoppingCart = await useCases.closeCart(userId);
    return c.json(shoppingCart);
  });
  return app;
};
