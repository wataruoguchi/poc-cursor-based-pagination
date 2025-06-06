import type { DBClient } from "@/infrastructure/database";
import { createLogger } from "@/infrastructure/logger";
import { orderUseCases } from "@/modules/order/application/order.usecases";
import { createShoppingCartRepository } from "@/modules/order/infrastructure/order.repository";
import { createOrderController } from "@/modules/order/interfaces/order.controller";
import { organizationUseCases } from "@/modules/organization/application/organization.usecases";
import { createOrganizationRepository } from "@/modules/organization/infrastructure/organization.repository";
import { createOrganizationController } from "@/modules/organization/interfaces/organization.controller";
import { userUseCases } from "@/modules/user/application/user.usecases";
import { createUserRepository } from "@/modules/user/infrastructure/user.repository";
import { createUserController } from "@/modules/user/interfaces/user.controller";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { productUseCases } from "./modules/product/application/product.usecases";
import { createProductRepository } from "./modules/product/infrastructure/product.repository";
import { createProductController } from "./modules/product/interface/product.controller";

const logger = createLogger("our-backend");
/**
 * Loggers can be created for each module.
 */
const loggerForUserController = logger.child({
  module: "controller:user",
});
const loggerForUserRepository = logger.child({
  module: "repository:user",
});
const loggerForUserUseCases = logger.child({
  module: "usecase:user",
});
const loggerForOrderController = logger.child({
  module: "controller:order",
});
const loggerForShoppingCartRepository = logger.child({
  module: "repository:shopping-cart",
});
const loggerForOrderUseCases = logger.child({
  module: "usecase:order",
});
const loggerForProductController = logger.child({
  module: "controller:product",
});
const loggerForProductRepository = logger.child({
  module: "repository:product",
});
const loggerForProductUseCases = logger.child({
  module: "usecase:product",
});
const loggerForOrganizationController = logger.child({
  module: "controller:organization",
});
const loggerForOrganizationRepository = logger.child({
  module: "repository:organization",
});
const loggerForOrganizationUseCases = logger.child({
  module: "usecase:organization",
});

export function getApp(db: DBClient) {
  /**
   * Cross-module example. getUserById is not part of the order module but the user module.
   */
  const { getAllUsers, getUserById, inviteUser } = userUseCases(
    createUserRepository(db, loggerForUserRepository),
    loggerForUserUseCases,
  );

  const api = new Hono();
  api.use("*", cors({ origin: "https://localhost:5173" }));
  api
    .route(
      "/users",
      createUserController(
        { getAllUsers, getUserById, inviteUser },
        loggerForUserController,
      ),
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
    )
    .route(
      "/products",
      createProductController(
        productUseCases(
          createProductRepository(db, loggerForProductRepository),
          loggerForProductUseCases,
        ),
        loggerForProductController,
      ),
    )
    .route(
      "/organizations",
      createOrganizationController(
        organizationUseCases(
          createOrganizationRepository(db, loggerForOrganizationRepository),
          loggerForOrganizationUseCases,
        ),
        loggerForOrganizationController,
      ),
    );

  const app = new Hono();
  app.route("/api", api).get("/", (c) => c.json({ message: "Hello, World!" }));
  return app;
}
