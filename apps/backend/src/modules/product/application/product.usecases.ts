/**
 * This is where everything meets.
 */
import type { Logger } from "@/infrastructure/logger";
import { createPaginatedUseCase } from "@/shared/utils/pagination/usecase";
import { productSchema, type Product } from "../domain/product.entity";
import type { ProductRepository } from "../infrastructure/product.repository";

type ProductRecord = {
  id: string;
  product_name: string;
  created_at: Date;
};

export type ProductUseCases = ReturnType<typeof productUseCases>;
export const productUseCases = (
  shoppingCartRepository: ProductRepository,
  logger: Logger,
) => {
  const defaultCursorData = {
    cursorValues: {},
    orderBy: ["created_at", "id"],
    limit: 10,
    direction: "next" as const,
    filters: {},
    timestamp: Date.now(),
  };
  return {
    findProducts: async (): Promise<Product[]> => {
      logger.info("start findProducts");
      const products = await shoppingCartRepository.findProducts();
      logger.info({ products }, "end findProducts");
      return products.map((product) =>
        productSchema.parse({
          id: product.id,
          name: product.product_name,
        }),
      );
    },
    findProductsPaginated: createPaginatedUseCase<ProductRecord, Product>(
      logger,
      shoppingCartRepository.findProductsPaginated().paginatedQuery,
      (product) =>
        productSchema.parse({
          id: product.id,
          name: product.product_name,
        }),
      defaultCursorData,
    ).paginatedUseCase,
  };
};
