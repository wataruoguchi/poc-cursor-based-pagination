/**
 * This is where everything meets.
 */
import type { Logger } from "@/infrastructure/logger";
import type { GetUserById } from "@/modules/user/application/user-use-cases"; // User use cases are not part of the order module. We should not import the module directly.
import { type ShoppingCart, shoppingCartSchema } from "../domain/shopping-cart";
import type { ShoppingCartRepository } from "../infrastructure/repository";

export type OrderUseCases = ReturnType<typeof orderUseCases>;
export const orderUseCases = (
  shoppingCartRepository: ShoppingCartRepository,
  logger: Logger,
  getUserById: GetUserById,
) => ({
  findShoppingCartByUserId: async (userId: string): Promise<ShoppingCart> => {
    logger.info("start findShoppingCartByUserId", { userId });
    const shoppingCart =
      await shoppingCartRepository.findByUserIdOrCreate(userId);
    logger.info("end findShoppingCartByUserId", { shoppingCart });
    return parseShoppingCart(shoppingCart);
  },
  addItemToCart: async (
    userId: string,
    itemId: string,
  ): Promise<ShoppingCart> => {
    logger.info("start addItemToCart", { userId, itemId });
    await shoppingCartRepository.addItem(userId, itemId);
    const shoppingCart =
      await shoppingCartRepository.findByUserIdOrCreate(userId);
    logger.info("end addItemToCart", { shoppingCart });
    return parseShoppingCart(shoppingCart);
  },
  removeItemFromCart: async (
    userId: string,
    itemId: string,
  ): Promise<ShoppingCart> => {
    logger.info("start removeItemFromCart", { userId, itemId });
    await shoppingCartRepository.removeItem(userId, itemId);
    const shoppingCart =
      await shoppingCartRepository.findByUserIdOrCreate(userId);
    logger.info("end removeItemFromCart", { shoppingCart });
    return parseShoppingCart(shoppingCart);
  },
  closeCart: async (
    userId: string,
  ): Promise<{
    shoppingCart: ShoppingCart;
    user: Awaited<ReturnType<GetUserById>>;
  }> => {
    logger.info("start closeCart", { userId });
    await shoppingCartRepository.closeCart(userId);
    const shoppingCart =
      await shoppingCartRepository.findByUserIdOrCreate(userId);
    logger.info("end closeCart", { shoppingCart });
    const user = await getUserById(userId);
    return {
      shoppingCart: parseShoppingCart(shoppingCart),
      user,
    };
  },
});

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
