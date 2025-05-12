import type { DBClient } from "@/infrastructure/database";
import { createLogger } from "@/infrastructure/logger";
import { orderUseCases } from "@/modules/order/application/order-use-cases";
import { createShoppingCartRepository } from "@/modules/order/infrastructure/repository";
import { createOrderController } from "@/modules/order/interfaces/order-controller";
import { userUseCases } from "@/modules/user/application/user-use-cases";
import { createUserRepository } from "@/modules/user/infrastructure/repository";
import { createUserController } from "@/modules/user/interfaces/user-controller";
import { Hono } from "hono";

const logger = createLogger("our-backend");
/**
 * Loggers can be created for each module.
 */
const loggerForUserUseCases = logger.child({
  module: "usecase:user",
});
const loggerForOrderUseCases = logger.child({
  module: "usecase:order",
});
const loggerForUserRepository = logger.child({
  module: "repository:user",
});
const loggerForShoppingCartRepository = logger.child({
  module: "repository:shopping-cart",
});
const loggerForUserController = logger.child({
  module: "controller:user",
});
const loggerForOrderController = logger.child({
  module: "controller:order",
});

export function getApp(db: DBClient) {
  /**
   * Cross-module example. getUserById is not part of the order module but the user module.
   */
  const { getAllUsers, getUserById } = userUseCases(
    createUserRepository(db, loggerForUserRepository),
    loggerForUserUseCases,
  );

  const api = new Hono();
  api
    .route(
      "/users",
      createUserController({ getAllUsers }, loggerForUserController),
    )
    .route(
      "/orders",
      createOrderController(
        orderUseCases(
          createShoppingCartRepository(db, loggerForShoppingCartRepository),
          loggerForOrderUseCases,
          getUserById,
        ),
        loggerForOrderController,
      ),
    );

  const app = new Hono();
  app.route("/api", api).get("/", (c) => c.json({ message: "Hello, World!" }));
  return app;
}
