import type { ZodSchema } from "zod";
import { z } from "zod";

export async function fetchWithAuth<T>(
  getAccessTokenSilently: () => Promise<string>,
  url: string,
  schema: ZodSchema<T> = z.any(),
  options: RequestInit = {},
) {
  const token = await getAccessTokenSilently();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  const resJson = await res.json();
  const parsed = schema.safeParse(resJson);

  if (!parsed.success) {
    throw new Error(`Invalid data: ${parsed.error.message}`);
  }

  return parsed.data;
}

export type FetchWithAuthPaginatedFn<T> = typeof fetchWithAuthPaginated<T>;

/**
 * This is going to be used for paginated queries with useInfiniteQuery.
 * It will return a paginated response with the data and the meta object.
 */
export function fetchWithAuthPaginated<T>(
  getAccessTokenSilently: () => Promise<string>,
  url: string,
  itemSchema: ZodSchema<T>,
  options: RequestInit = {},
) {
  const paginatedSchema = z.object({
    data: z.array(itemSchema),
    meta: z.object({
      nextCursor: z.string().optional(),
      previousCursor: z.string().optional(),
      totalRowCount: z.number(),
    }),
  });

  return fetchWithAuth(getAccessTokenSilently, url, paginatedSchema, options);
}
