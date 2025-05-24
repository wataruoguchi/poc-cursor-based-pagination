import {
  type InfiniteData,
  type QueryFunction,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { type ZodSchema, z } from "zod";
import {
  type FetchWithAuthPaginatedFn,
  fetchWithAuthPaginated,
} from "../lib/fetch-with-auth";

export interface QueryParams {
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  filters?: Record<string, string>;
  search?: string;
}

interface PageData<T> {
  data: T[];
  meta: {
    nextCursor?: string;
    previousCursor?: string;
    totalRowCount?: number;
  };
}

type UseAuthPaginationQueryOptions<T> = Omit<
  UseInfiniteQueryOptions<
    PageData<T>,
    Error,
    InfiniteData<PageData<T>, unknown>
  >,
  | "queryKey"
  | "queryFn"
  | "initialPageParam"
  | "getNextPageParam"
  | "getPreviousPageParam"
>;

// Fake it. Not important for this PoC.
const useAuth0 = () => {
  return {
    getAccessTokenSilently: async () => "access-token",
  };
};

export function useAuthPaginationQuery<T>(
  key: string[],
  url: string,
  schema: ZodSchema<T>,
  queryParams?: QueryParams,
  options?: UseAuthPaginationQueryOptions<T>,
) {
  const { getAccessTokenSilently } = useAuth0();

  return useInfiniteQuery<
    PageData<T>,
    Error,
    InfiniteData<PageData<T>, unknown>
  >({
    queryKey: queryParams ? [...key, queryParams] : key,
    queryFn: createQueryFn(
      getAccessTokenSilently,
      fetchWithAuthPaginated,
      url,
      schema,
      queryParams,
    ),
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    getPreviousPageParam: (firstPage) => firstPage.meta.previousCursor,
    initialPageParam: undefined,
    ...options,
  });
}

// Exporting this for testing purposes. Which is not ideal, but it's the only way to test the queryFn.
export function createQueryFn<T>(
  getAccessTokenSilently: () => Promise<string>,
  fetchWithAuthPaginated: FetchWithAuthPaginatedFn<T>,
  url: string,
  schema: ZodSchema<T>,
  queryParams?: QueryParams,
): QueryFunction<PageData<T>, readonly unknown[], unknown> {
  return async (context) => {
    const pageParam = context.pageParam;
    const cursor = z.string().safeParse(pageParam).success
      ? (pageParam as string)
      : undefined;

    // Build search params
    const searchParams: Record<string, string> = {
      ...(queryParams ? queryParamsToSearchParams(queryParams) : {}),
      ...(cursor ? { cursor: cursor } : {}),
    };

    // Append search params to url if they exist
    const searchParamsString = new URLSearchParams(
      Object.entries(searchParams).filter(([, value]) => value !== undefined),
    ).toString();

    // Fetch data
    return await fetchWithAuthPaginated(
      getAccessTokenSilently,
      searchParamsString.length > 0 ? `${url}?${searchParamsString}` : url,
      schema,
    );
  };
}

function queryParamsToSearchParams(
  queryParams: QueryParams,
): Record<string, string> {
  return {
    ...Object.entries(queryParams).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          if (typeof value === "string" || typeof value === "number") {
            acc[key] = `${value}`;
          } else if (key === "filters") {
            // Do nothing
          } else {
            throw new Error(`Unsupported query param type: ${key}`);
          }
        }
        return acc;
      },
      {},
    ),
    ...flattenFilters(queryParams),
  };
}

function flattenFilters(queryParams: QueryParams): Record<string, string> {
  return queryParams.filters
    ? Object.fromEntries(
        Object.entries(queryParams.filters).map(([key, value]) => [
          `filter.${key}`,
          value,
        ]),
      )
    : {};
}
