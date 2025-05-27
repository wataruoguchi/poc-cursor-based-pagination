import { z } from "zod";

export const shoppingCartSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(["Opened", "Closed"]),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      productName: z.string(),
      quantity: z.coerce.number(),
    }),
  ),
});

export type ShoppingCart = z.infer<typeof shoppingCartSchema>;
