/**
 * This is where everything meets.
 */
import type { Logger } from "@/infrastructure/logger";
import type { GetUserById } from "@/modules/user/application/user.usecases"; // User use cases are not part of the order module. We should not import the module directly.
import { type ShoppingCart, shoppingCartSchema } from "../domain/order.entity";
import type { ShoppingCartRepository } from "../infrastructure/order.repository";

type ProductRecord = {
  id: string;
  product_name: string;
  created_at: Date;
};

export type OrderUseCases = ReturnType<typeof orderUseCases>;
export const orderUseCases = (
  shoppingCartRepository: ShoppingCartRepository,
  logger: Logger,
  getUserById: GetUserById,
) => {
  return {
    findShoppingCartByUserId: async (userId: string): Promise<ShoppingCart> => {
      logger.info({ userId }, "start findShoppingCartByUserId");
      const shoppingCart =
        await shoppingCartRepository.findByUserIdOrCreate(userId);
      logger.info({ shoppingCart }, "end findShoppingCartByUserId");
      return parseShoppingCart(shoppingCart);
    },
    addItemToCart: async (
      userId: string,
      itemId: string,
    ): Promise<ShoppingCart> => {
      logger.info({ userId, itemId }, "start addItemToCart");
      await shoppingCartRepository.addItem(userId, itemId);
      const shoppingCart =
        await shoppingCartRepository.findByUserIdOrCreate(userId);
      logger.info({ shoppingCart }, "end addItemToCart");
      return parseShoppingCart(shoppingCart);
    },
    removeItemFromCart: async (
      userId: string,
      itemId: string,
    ): Promise<ShoppingCart> => {
      logger.info({ userId, itemId }, "start removeItemFromCart");
      await shoppingCartRepository.removeItem(userId, itemId);
      const shoppingCart =
        await shoppingCartRepository.findByUserIdOrCreate(userId);
      logger.info({ shoppingCart }, "end removeItemFromCart");
      return parseShoppingCart(shoppingCart);
    },
    closeCart: async (
      userId: string,
    ): Promise<{
      shoppingCart: ShoppingCart;
      user: Awaited<ReturnType<GetUserById>>;
    }> => {
      logger.info({ userId }, "start closeCart");
      await shoppingCartRepository.closeCart(userId);
      const shoppingCart =
        await shoppingCartRepository.findByUserIdOrCreate(userId);
      logger.info({ shoppingCart }, "end closeCart");
      const user = await getUserById(userId);
      return {
        shoppingCart: parseShoppingCart(shoppingCart),
        user,
      };
    },
  };
};

/**
 * Parses the shopping cart RAW data from the database to the domain model.
 */
function parseShoppingCart(
  shoppingCart: Awaited<
    ReturnType<ShoppingCartRepository["findByUserIdOrCreate"]>
  >,
): ShoppingCart {
  return shoppingCartSchema.parse({
    ...shoppingCart[0],
    userId: shoppingCart[0].person_id,
    items: shoppingCart
      .filter((item) => item.product_id !== null)
      .map((item) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
      })),
  });
}
