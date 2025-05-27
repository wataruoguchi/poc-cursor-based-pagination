import { z } from "zod";

export const FetchedProductsSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type FetchedProducts = z.infer<typeof FetchedProductsSchema>;

export const getApiEndpointPath =
  "https://localhost:3000/api/products/paginated" as const;

export const queryKeyToProducts = ["products"];
