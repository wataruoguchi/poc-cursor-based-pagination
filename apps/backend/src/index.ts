import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getDB } from "./infrastructure/database.js";
import { createLogger } from "./infrastructure/logger.js";
import { createUserRepository } from "./modules/user/infrastructure/repository.js";
import { createUserController } from "./modules/user/interfaces/user-controller.js";

const logger = createLogger("our-backend");
const app = new Hono();
const db = getDB();
const userRepository = createUserRepository(db, logger);

app.route("/api", createUserController(userRepository, logger));

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`);
  },
);
