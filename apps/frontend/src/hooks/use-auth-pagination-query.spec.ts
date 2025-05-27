import { QueryClient } from "@tanstack/react-query";
import { type Mock, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { FetchWithAuthPaginatedFn } from "../lib/fetch-with-auth";
import { createQueryFn } from "./use-auth-pagination-query";

describe("createQueryFn", () => {
  const mockGetAccessTokenSilently = vi.fn().mockResolvedValue("mock-token");
  const mockFetchWithAuthPaginated = vi.fn() as Mock &
    FetchWithAuthPaginatedFn<unknown>;
  const mockUrl = "https://api.example.com/data";
  const mockSchema = z.object({
    id: z.string(),
    name: z.string(),
  });

  const mockQueryContext = {
    client: new QueryClient(),
    queryKey: ["test"],
    signal: new AbortController().signal,
    direction: "forward" as const,
    meta: undefined,
  };

  it("should handle basic query without params", async () => {
    const mockResponse = {
      data: [{ id: "1", name: "Test" }],
      meta: { nextCursor: "next", previousCursor: "prev", totalRowCount: 100 },
    };
    mockFetchWithAuthPaginated.mockResolvedValueOnce(mockResponse);

    const queryFn = createQueryFn(
      mockGetAccessTokenSilently,
      mockFetchWithAuthPaginated,
      mockUrl,
      mockSchema,
    );

    const result = await queryFn({ ...mockQueryContext, pageParam: undefined });

    expect(mockFetchWithAuthPaginated).toHaveBeenCalledWith(
      mockGetAccessTokenSilently,
      mockUrl,
      mockSchema,
    );
    expect(result).toEqual(mockResponse);
  });

  it("should handle query with cursor", async () => {
    const mockResponse = {
      data: [{ id: "1", name: "Test" }],
      meta: {
        nextCursor: "next2",
        previousCursor: "prev2",
        totalRowCount: 100,
      },
    };
    mockFetchWithAuthPaginated.mockResolvedValueOnce(mockResponse);

    const queryFn = createQueryFn(
      mockGetAccessTokenSilently,
      mockFetchWithAuthPaginated,
      mockUrl,
      mockSchema,
    );

    const pageParam = "cursor123";

    const result = await queryFn({
      ...mockQueryContext,
      pageParam,
    });

    expect(mockFetchWithAuthPaginated).toHaveBeenCalledWith(
      mockGetAccessTokenSilently,
      `${mockUrl}?cursor=${pageParam}`,
      mockSchema,
    );
    expect(result).toEqual(mockResponse);
  });

  it("should handle query with queryParams", async () => {
    const mockResponse = {
      data: [{ id: "1", name: "Test" }],
      meta: { nextCursor: "next3", previousCursor: "prev3" },
    };
    mockFetchWithAuthPaginated.mockResolvedValueOnce(mockResponse);

    const queryParams = {
      limit: 10,
      sort: "name",
      order: "asc" as const,
      search: "test",
      filters: { status: "active" },
    };

    const queryFn = createQueryFn(
      mockGetAccessTokenSilently,
      mockFetchWithAuthPaginated,
      mockUrl,
      mockSchema,
      queryParams,
    );

    const result = await queryFn({ ...mockQueryContext, pageParam: undefined });

    expect(mockFetchWithAuthPaginated).toHaveBeenCalledWith(
      mockGetAccessTokenSilently,
      `${mockUrl}?limit=10&sort=name&order=asc&search=test&filter.status=active`,
      mockSchema,
    );
    expect(result).toEqual(mockResponse);
  });

  it("should handle query with both cursor and queryParams", async () => {
    const mockResponse = {
      data: [{ id: "1", name: "Test" }],
      meta: { nextCursor: "next4", previousCursor: "prev4" },
    };
    mockFetchWithAuthPaginated.mockResolvedValueOnce(mockResponse);

    const queryParams = {
      limit: 10,
      sort: "name",
    };

    const queryFn = createQueryFn(
      mockGetAccessTokenSilently,
      mockFetchWithAuthPaginated,
      mockUrl,
      mockSchema,
      queryParams,
    );

    const pageParam = "cursor456";
    const result = await queryFn({
      ...mockQueryContext,
      pageParam,
    });

    expect(mockFetchWithAuthPaginated).toHaveBeenCalledWith(
      mockGetAccessTokenSilently,
      `${mockUrl}?limit=10&sort=name&cursor=${pageParam}`,
      mockSchema,
    );
    expect(result).toEqual(mockResponse);
  });
});
