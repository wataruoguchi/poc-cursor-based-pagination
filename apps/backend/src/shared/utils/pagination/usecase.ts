import type { Logger } from "@/infrastructure/logger.ts";
import { z } from "zod";
import type { PaginatedQuery } from "./repository.ts";

const cursorSchema = z.object({
  // Columns to order by. Values are the values of the columns to start from.
  columns: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.date(), z.null()]),
  ),
  // Pagination.
  limit: z.number().int().positive(),
  // Direction of the pagination.
  direction: z.enum(["next", "prev"]),
  // Filters.
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  // Timestamp. The timestamp of the cursor. We can use it to detect if the cursor is outdated.
  timestamp: z.number(),
});
export type CursorData = z.infer<typeof cursorSchema>;

export const paginatedMetaSchema = z.object({
  nextCursor: z.string().optional(),
  previousCursor: z.string().optional(),
  hasMore: z.boolean(),
  totalRowCount: z.number(),
});

type PaginatedMeta = z.infer<typeof paginatedMetaSchema>;

type PaginatedResult<T> = {
  data: T[];
  meta: PaginatedMeta;
};

export function getDefaultCursorData(): CursorData {
  return {
    columns: {
      created_at: null,
      id: null,
    },
    limit: 10,
    direction: "next",
    filters: {},
    timestamp: Date.now(),
  };
}

export type BaseRecord = Record<
  string,
  string | number | boolean | Date | null
>;

/**
 * A DEPENDENCY FOR USE CASES.
 *
 * This function is used to manage the cursor and the pagination.
 *
 * @param paginatedQuery - The paginated query to use.
 * @param transformItem - A function to transform the items. It is used to transform the items to the desired format. e.g., (item) => z.object({ id: z.string(), name: z.string() }).parse(item)
 * @param defaultDecodedCursor - The default decoded cursor.
 * @returns A function that can be used to paginate the query.
 */
export function createPaginatedUseCase<
  T extends BaseRecord,
  R extends Record<string, unknown>,
>(
  logger: Logger,
  paginatedQuery: PaginatedQuery<T>,
  transformItem: (item: T) => R,
  defaultDecodedCursor = getDefaultCursorData(),
) {
  return {
    /**
     * This function is used to paginate the query.
     *
     * @param encodedCursor - The encoded cursor.
     * @returns The paginated items, the total count and a boolean indicating if there is more data to fetch.
     */
    paginatedUseCase: async function paginatedUseCase(
      encodedCursor?: string,
    ): Promise<PaginatedResult<R>> {
      // Create cursor data from parameters or use existing cursor
      const decodedCursor = createParseCursor(logger)(
        defaultDecodedCursor,
        encodedCursor,
      );
      const { items, totalCount, hasMore } =
        await paginatedQuery(decodedCursor);

      const nextCursor =
        hasMore && items.length > 0 && decodedCursor
          ? createNextCursor(decodedCursor, items[items.length - 1])
          : undefined;

      const previousCursor =
        encodedCursor && items.length > 0 && decodedCursor
          ? createPreviousCursor(decodedCursor, items[0])
          : undefined;

      return {
        data: items.map(transformItem),
        meta: {
          nextCursor,
          previousCursor,
          hasMore,
          totalRowCount: totalCount,
        },
      };
    },
  };
}

function createParseCursor(logger: Logger) {
  return function parseCursor(
    defaultCursorData: CursorData,
    cursor?: string,
  ): CursorData {
    try {
      return {
        ...defaultCursorData,
        ...(cursor ? decodeCursor(cursor) : {}),
      };
    } catch (error) {
      logger.error({ cursor, error }, "Failed to parse cursor");
      return defaultCursorData;
    }
  };
}

export function encodeCursor(data: CursorData): string {
  // Convert Date objects to ISO strings for JSON serialization
  const serializableData = {
    ...data,
    columns: Object.fromEntries(
      Object.entries(data.columns).map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : value,
      ]),
    ),
  };
  return Buffer.from(JSON.stringify(serializableData)).toString("base64");
}

export function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const data = JSON.parse(decoded);

    // Convert ISO date strings back to Date objects
    const parsedData = {
      ...data,
      columns: Object.fromEntries(
        Object.entries(data.columns).map(([key, value]) => [
          key,
          typeof value === "string" && isISODateString(value)
            ? new Date(value)
            : value,
        ]),
      ),
    };

    return cursorSchema.parse(parsedData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid cursor format: not valid JSON", {
        cause: error,
      });
    }
    if (error instanceof z.ZodError) {
      throw new Error("Invalid cursor data structure", { cause: error });
    }
    throw new Error("Failed to decode cursor", { cause: error });
  }
}

// Helper function to detect ISO date strings
function isISODateString(value: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return isoDateRegex.test(value) && !Number.isNaN(Date.parse(value));
}

function createNextCursor(
  currentCursor: CursorData,
  lastItem: BaseRecord,
): string {
  return encodeCursor({
    ...createCursorData(currentCursor, lastItem),
    direction: "next",
  });
}

function createPreviousCursor(
  currentCursor: CursorData,
  firstItem: BaseRecord,
): string {
  return encodeCursor({
    ...createCursorData(currentCursor, firstItem),
    direction: "prev",
  });
}

function createCursorData(
  currentCursor: CursorData,
  item: BaseRecord,
): CursorData {
  return {
    ...currentCursor,
    columns: {
      ...Object.keys(currentCursor.columns).reduce((acc, key) => {
        acc[key] = item[key];
        return acc;
      }, {} as BaseRecord),
    },
    timestamp: Date.now(),
  };
}
