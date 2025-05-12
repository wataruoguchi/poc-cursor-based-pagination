import type { Logger } from "@/infrastructure/logger";
import type { ShoppingCartRepository } from "@/modules/order/domain/shopping-cart-repository.type";
import type { GetUserById } from "@/modules/user/application/user-use-cases"; // User use cases are not part of the order module. We should not import the module directly.

export type OrderUseCases = ReturnType<typeof orderUseCases>;
export const orderUseCases = (
  shoppingCartRepository: ShoppingCartRepository,
  logger: Logger,
  getUserById: GetUserById,
) => ({
  findShoppingCartByUserId: async (userId: string) => {
    logger.info("start findShoppingCartByUserId", { userId });
    const shoppingCart =
      await shoppingCartRepository.findByUserIdOrCreate(userId);
    logger.info("end findShoppingCartByUserId", { shoppingCart });
    return shoppingCart;
  },
  addItemToCart: async (userId: string, itemId: string) => {
    logger.info("start addItemToCart", { userId, itemId });
    await shoppingCartRepository.addItem(userId, itemId);
    const shoppingCart =
      await shoppingCartRepository.findByUserIdOrCreate(userId);
    logger.info("end addItemToCart", { shoppingCart });
    return shoppingCart;
  },
  removeItemFromCart: async (userId: string, itemId: string) => {
    logger.info("start removeItemFromCart", { userId, itemId });
    await shoppingCartRepository.removeItem(userId, itemId);
    const shoppingCart =
      await shoppingCartRepository.findByUserIdOrCreate(userId);
    logger.info("end removeItemFromCart", { shoppingCart });
    return shoppingCart;
  },
  closeCart: async (userId: string) => {
    logger.info("start closeCart", { userId });
    await shoppingCartRepository.closeCart(userId);
    const shoppingCart =
      await shoppingCartRepository.findByUserIdOrCreate(userId);
    logger.info("end closeCart", { shoppingCart });
    const user = await getUserById(userId);
    return {
      shoppingCart,
      user,
    };
  },
});
