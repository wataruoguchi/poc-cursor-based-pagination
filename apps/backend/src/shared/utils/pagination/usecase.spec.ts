import { createLogger } from "@/infrastructure/logger";
import { describe, expect, it, vi } from "vitest";
import {
  createPaginatedUseCase,
  decodeCursor,
  encodeCursor,
  getDefaultCursorData,
  type BaseRecord,
  type CursorData,
} from "./usecase";

// Mock logger that matches pino interface
// Mock paginated query function
const createMockPaginatedQuery = <T extends BaseRecord>(
  mockItems: T[],
  totalCount: number,
  hasMore: boolean,
) => {
  return vi.fn().mockResolvedValue({
    items: mockItems,
    totalCount,
    hasMore,
  });
};

describe("Pagination Use Case", () => {
  describe("createPaginatedUseCase", () => {
    it("should create a paginated use case with default cursor", async () => {
      const TOTAL_COUNT = 10;
      const HAS_MORE = true;
      const mockItems = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];
      const mockPaginatedQuery = createMockPaginatedQuery(
        mockItems,
        TOTAL_COUNT,
        HAS_MORE,
      );
      const mockLogger = createLogger("test");

      const result = await createPaginatedUseCase(
        mockLogger,
        mockPaginatedQuery,
        (item) => item,
      ).paginatedUseCase();

      expect(result).toEqual({
        data: mockItems,
        meta: {
          hasMore: HAS_MORE,
          totalRowCount: TOTAL_COUNT,
          nextCursor: expect.any(String),
          previousCursor: undefined,
        },
      });
    });

    it("should handle custom default cursor data", async () => {
      const TOTAL_COUNT = 5;
      const HAS_MORE = false;
      const mockItems = [{ id: "1", name: "Item 1" }];
      const mockPaginatedQuery = createMockPaginatedQuery(
        mockItems,
        TOTAL_COUNT,
        HAS_MORE,
      );
      const mockLogger = createLogger("test");

      const customDefaultCursor: CursorData = {
        ...getDefaultCursorData(),
        columns: {
          name: null,
        },
        limit: 5,
      };

      await createPaginatedUseCase(
        mockLogger,
        mockPaginatedQuery,
        (item) => item,
        customDefaultCursor,
      ).paginatedUseCase();

      expect(mockPaginatedQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: customDefaultCursor.columns,
          limit: customDefaultCursor.limit,
        }),
      );
    });

    it("should decode and use provided cursor", async () => {
      const mockItems = [{ id: "2", name: "Item 2" }];
      const mockPaginatedQuery = createMockPaginatedQuery(mockItems, 5, true);
      const mockLogger = createLogger("test");

      const useCase = createPaginatedUseCase(
        mockLogger,
        mockPaginatedQuery,
        (item) => item,
      );

      // Create a cursor for the second page
      const cursorData: CursorData = {
        ...getDefaultCursorData(),
        columns: {
          id: "1",
        },
        direction: "next",
      };

      await useCase.paginatedUseCase(encodeCursor(cursorData));

      expect(mockPaginatedQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: cursorData.columns,
          direction: cursorData.direction,
        }),
      );
    });

    it("should handle invalid cursor gracefully", async () => {
      const mockPaginatedQuery = createMockPaginatedQuery(
        [{ id: "1", name: "Item 1" }],
        1,
        false,
      );
      const mockLogger = createLogger("test");

      await createPaginatedUseCase(
        mockLogger,
        mockPaginatedQuery,
        (item) => item,
      ).paginatedUseCase("invalid-cursor");

      // Should fall back to default cursor
      expect(mockPaginatedQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          ...getDefaultCursorData(),
          timestamp: expect.any(Number),
        }),
      );
    });

    it("should create next cursor when there are more items", async () => {
      const TOTAL_COUNT = 10;
      const HAS_MORE = true;
      const mockItems = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];
      const mockLogger = createLogger("test");

      const result = await createPaginatedUseCase(
        mockLogger,
        createMockPaginatedQuery(mockItems, TOTAL_COUNT, HAS_MORE),
        (item) => item,
      ).paginatedUseCase();

      expect(result).toEqual({
        data: mockItems,
        meta: {
          hasMore: HAS_MORE,
          totalRowCount: TOTAL_COUNT,
          nextCursor: expect.any(String),
          previousCursor: undefined,
        },
      });

      // Decode the next cursor to verify it's correct
      const nextCursor = result.meta.nextCursor;
      expect(nextCursor).toBeDefined();
      if (nextCursor) {
        expect(decodeCursor(nextCursor)).toEqual({
          columns: {
            id: mockItems.findLast((item) => item.id)?.id,
          },
          direction: "next",
          limit: getDefaultCursorData().limit,
          filters: getDefaultCursorData().filters,
          timestamp: expect.any(Number),
        });
      }
    });

    it("should create previous cursor when navigating with a cursor", async () => {
      const mockItems = [{ id: "2", name: "Item 2" }];
      const mockLogger = createLogger("test");

      // Create a cursor for the second page
      const cursorData: CursorData = {
        ...getDefaultCursorData(),
        columns: {
          id: "1",
        },
        direction: "next",
      };

      const result = await createPaginatedUseCase(
        mockLogger,
        createMockPaginatedQuery(mockItems, 5, true),
        (item) => item,
      ).paginatedUseCase(encodeCursor(cursorData));
      expect(result.meta.previousCursor).toBeDefined();

      // Decode the previous cursor to verify it's correct
      const previousCursor = result.meta.previousCursor;
      expect(previousCursor).toBeDefined();
      if (previousCursor) {
        expect(decodeCursor(previousCursor)).toEqual({
          columns: {
            id: mockItems.find((item) => item.id)?.id,
          },
          direction: "prev",
          limit: getDefaultCursorData().limit,
          filters: getDefaultCursorData().filters,
          timestamp: expect.any(Number),
        });
      }
    });

    it("should not create next cursor when no more items", async () => {
      const mockLogger = createLogger("test");
      const result = await createPaginatedUseCase(
        mockLogger,
        createMockPaginatedQuery([{ id: "1", name: "Item 1" }], 1, false),
        (item) => item,
      ).paginatedUseCase();
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it("should not create previous cursor when no initial cursor provided", async () => {
      const mockLogger = createLogger("test");
      const result = await createPaginatedUseCase(
        mockLogger,
        createMockPaginatedQuery([{ id: "1", name: "Item 1" }], 1, false),
        (item) => item,
      ).paginatedUseCase();
      expect(result.meta.previousCursor).toBeUndefined();
    });

    it("should transform items using the provided transform function", async () => {
      const mockLogger = createLogger("test");
      const result = await createPaginatedUseCase(
        mockLogger,
        createMockPaginatedQuery(
          [
            { id: "1", name: "Item 1", extra: "data" },
            { id: "2", name: "Item 2", extra: "data" },
          ],
          2,
          false,
        ),
        (item) => ({ id: item.id, name: item.name }), // Remove extra field
      ).paginatedUseCase();

      expect(result.data).toEqual([
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ]);
      expect(result.data[0]).not.toHaveProperty("extra");
    });

    it("should handle empty result set", async () => {
      const mockLogger = createLogger("test");
      const result = await createPaginatedUseCase(
        mockLogger,
        createMockPaginatedQuery([], 0, false),
        (item) => item,
      ).paginatedUseCase();

      expect(result).toEqual({
        data: [],
        meta: {
          hasMore: false,
          totalRowCount: 0,
          nextCursor: undefined,
          previousCursor: undefined,
        },
      });
    });

    it("should handle custom column for cursor creation", async () => {
      const mockItems = [
        { id: "1", name: "Item 1", custom_id: "custom1" },
        { id: "2", name: "Item 2", custom_id: "custom2" },
      ];
      const ID_COLUMN = "custom_id";
      const customDefaultCursor: CursorData = {
        ...getDefaultCursorData(),
        columns: {
          [ID_COLUMN]: null,
        },
      };
      const mockLogger = createLogger("test");

      const result = await createPaginatedUseCase(
        mockLogger,
        createMockPaginatedQuery(mockItems, 5, true),
        (item) => item,
        customDefaultCursor,
      ).paginatedUseCase();

      expect(result.meta.nextCursor).toBeDefined();

      // Decode the next cursor to verify it uses the custom column
      const nextCursor = result.meta.nextCursor;
      expect(nextCursor).toBeDefined();
      if (nextCursor) {
        const decodedNextCursor = decodeCursor(nextCursor);
        expect(decodedNextCursor.columns[ID_COLUMN]).toBe(
          mockItems.findLast((item) => item[ID_COLUMN])?.[ID_COLUMN],
        );
      }
    });
  });
});
