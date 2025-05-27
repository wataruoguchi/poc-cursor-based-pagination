import type { Logger } from "@/infrastructure/logger";
import { Hono } from "hono";
import type { ProductUseCases } from "../application/product.usecases";

export const createProductController = (
  useCases: ProductUseCases,
  logger: Logger,
) => {
  const app = new Hono();

  app.get("/", async (c) => {
    logger.info("Getting products");
    const products = await useCases.findProducts();
    return c.json(products);
  });

  app.get("/paginated", async (c) => {
    logger.info("Getting products");
    const cursor = c.req.query("cursor");

    // Parse filters from query params (excluding cursor)
    const filters: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(c.req.query())) {
      if (key !== "cursor") {
        // Try to parse as number or boolean, fallback to string
        const numValue = Number(value);
        const boolValue =
          value === "true" ? true : value === "false" ? false : null;
        filters[key] = Number.isNaN(numValue)
          ? boolValue !== null
            ? boolValue
            : value
          : numValue;
      }
    }

    const result = await useCases.findProductsPaginated(cursor, filters);
    return c.json(result);
  });

  return app;
};
