import { getDb } from "@/infrastructure/database";
import { createLogger } from "@/infrastructure/logger";
import { orderUseCases } from "@/modules/order/application/order-use-cases";
import { createShoppingCartRepository } from "@/modules/order/infrastructure/repositories/shopping-cart-repository";
import { createOrderController } from "@/modules/order/interfaces/order-controller";
import { userUseCases } from "@/modules/user/application/user-use-cases";
import { createUserRepository } from "@/modules/user/infrastructure/repository";
import { createUserController } from "@/modules/user/interfaces/user-controller";
import { Hono } from "hono";

const logger = createLogger("our-backend");
const db = getDb();

/**
 * Cross-module example. getUserById is not part of the order module but the user module.
 */
const { getAllUsers, getUserById } = userUseCases(
  createUserRepository(db, logger),
  logger,
);

const api = new Hono();
api
  .route("/users", createUserController({ getAllUsers }, logger))
  .route(
    "/orders",
    createOrderController(
      orderUseCases(
        createShoppingCartRepository(db, logger),
        logger,
        getUserById,
      ),
      logger,
    ),
  );

const app = new Hono();
app.route("/api", api).get("/", (c) => c.json({ message: "Hello, World!" }));

export default app;
