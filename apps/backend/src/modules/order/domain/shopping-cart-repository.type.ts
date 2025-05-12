import type { ShoppingCart } from "./shopping-cart";

export interface ShoppingCartRepository {
  findByUserIdOrCreate(userId: string): Promise<ShoppingCart | null>;
  addItem(userId: string, itemId: string): Promise<void>;
  removeItem(userId: string, itemId: string): Promise<void>;
  closeCart(userId: string): Promise<void>;
}
