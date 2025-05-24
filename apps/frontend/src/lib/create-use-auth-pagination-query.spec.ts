import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { useAuthPaginationQuery } from "../hooks/use-auth-pagination-query";
import { createUseAuthPaginationQuery } from "./create-use-auth-pagination-query";

describe("createUseAuthPaginationQuery", () => {
  const mockUseAuthPaginationQuery =
    vi.fn() as unknown as typeof useAuthPaginationQuery<unknown>;
  const mockQueryKey = ["test", "query"];
  const mockUrl = "https://api.example.com/test";
  const mockSchema = z.object({
    id: z.string(),
    name: z.string(),
  });
  const mockQueryParams = {
    limit: 10,
    sort: "name",
    order: "asc" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a function that calls useAuthPaginationQuery with correct parameters", () => {
    const queryFn = createUseAuthPaginationQuery(
      mockUseAuthPaginationQuery,
      mockQueryKey,
      mockUrl,
      mockSchema,
      mockQueryParams,
    );

    // Call the returned function
    queryFn();

    // Verify useAuthPaginationQuery was called with correct parameters
    expect(mockUseAuthPaginationQuery).toHaveBeenCalledWith(
      mockQueryKey,
      mockUrl,
      mockSchema,
      mockQueryParams,
      {
        refetchOnWindowFocus: false,
      },
    );
  });

  it("should create a function that can be called multiple times", () => {
    const queryFn = createUseAuthPaginationQuery(
      mockUseAuthPaginationQuery,
      mockQueryKey,
      mockUrl,
      mockSchema,
      mockQueryParams,
    );

    // Call the function multiple times
    queryFn();
    queryFn();
    queryFn();

    // Verify useAuthPaginationQuery was called the correct number of times
    expect(mockUseAuthPaginationQuery).toHaveBeenCalledTimes(3);
  });

  it("should pass through the query parameters correctly", () => {
    const customQueryParams = {
      limit: 20,
      sort: "id",
      order: "desc" as const,
      search: "test",
      filters: { status: "active" },
    };

    const queryFn = createUseAuthPaginationQuery(
      mockUseAuthPaginationQuery,
      mockQueryKey,
      mockUrl,
      mockSchema,
      customQueryParams,
    );

    queryFn();

    expect(mockUseAuthPaginationQuery).toHaveBeenCalledWith(
      mockQueryKey,
      mockUrl,
      mockSchema,
      customQueryParams,
      {
        refetchOnWindowFocus: false,
      },
    );
  });
});
