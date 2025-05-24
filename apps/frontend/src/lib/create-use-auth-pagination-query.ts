import type { ZodSchema } from "zod";
import type {
  QueryParams,
  useAuthPaginationQuery,
} from "../hooks/use-auth-pagination-query";

/**
 * Creating a small wrapper around the useAuthPaginationQuery hook to encapsulate fetch-related
 *
 * It can not live in `src/components/InfiniteScrollingTable.tsx` because it will cause the warning below:
 * > Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components.
 */
export function createUseAuthPaginationQuery<T>(
  _useAuthPaginationQuery: typeof useAuthPaginationQuery<T>,
  queryKey: string[],
  url: string,
  schema: ZodSchema<T>,
  queryParams: QueryParams,
) {
  return () => {
    return _useAuthPaginationQuery(queryKey, url, schema, queryParams, {
      refetchOnWindowFocus: false,
    });
  };
}
