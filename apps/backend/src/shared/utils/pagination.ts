import type { DBClient } from "@/infrastructure/database";
import type { Logger } from "@/infrastructure/logger";
import { sql } from "kysely";
import type { DB } from "kysely-codegen";
import { z } from "zod";

type QueryBuilder = ReturnType<DBClient["selectFrom"]>;

export type PaginatedResult<T> = {
  data: T[];
  meta: {
    nextCursor: string | undefined;
    previousCursor: string | undefined;
    hasMore: boolean;
    totalRowCount: number;
  };
};

export type PaginationOptions = {
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
  searchColumn?: string;
};

// TODO: Refactor this to clarify who defines the default values.
export const createPaginatedRepository = <T>(
  db: DBClient,
  logger: Logger,
  tableName: keyof DB,
  options: PaginationOptions = {},
) => {
  const {
    defaultLimit = 10,
    defaultSortBy = "id",
    defaultSortOrder = "asc",
    searchColumn,
  } = options;

  return {
    findPaginated: async (cursor: CursorData | null) => {
      logger.info({ cursor, tableName }, "start findPaginated");

      let query = db.selectFrom(tableName).selectAll();

      // Apply search if provided
      if (cursor?.search && searchColumn) {
        query = (query as QueryBuilder).where(
          sql`${sql.ref(searchColumn)} ilike ${`%${cursor.search}%`}`,
        );
      }

      // Apply filters
      for (const [key, value] of Object.entries(cursor?.filters ?? {})) {
        query = (query as QueryBuilder).where(sql`${sql.ref(key)} = ${value}`);
      }

      // Apply cursor-based pagination
      if (cursor) {
        const { column, id, direction } = cursor;
        const comparison = direction === "next" ? ">" : "<";
        const order = direction === "next" ? "asc" : "desc";
        if (id && id !== "") {
          query = (query as QueryBuilder).where(
            sql`${sql.ref(column)} ${sql.raw(comparison)} ${id}`,
          );
        }
        query = (query as QueryBuilder).orderBy(
          sql`${sql.ref(column)} ${sql.raw(order)}`,
        );
      } else {
        // Default sorting if no cursor
        query = (query as QueryBuilder).orderBy(
          sql`${sql.ref(defaultSortBy)} ${sql.raw(defaultSortOrder)}`,
        );
      }

      // Get total count
      const countResult = await (db.selectFrom(tableName) as QueryBuilder)
        .select(sql`count(*)`.as("count"))
        .executeTakeFirstOrThrow();

      const totalCount = Number(countResult.count);

      // Execute the main query with limit from cursor or default
      const items = (await (query as QueryBuilder)
        .limit((cursor?.limit ?? defaultLimit) + 1) // We want to know if there is more data to fetch. To do that, we need to fetch one more item than the limit.
        .execute()) as T[];

      logger.info(
        {
          totalCount,
          itemsCount: items.length,
        },
        "end findPaginated",
      );

      return {
        items,
        totalCount,
      };
    },
  };
};

const defaultCursorData: CursorData = {
  column: "id",
  id: "",
  limit: 10,
  direction: "next",
  search: undefined,
  filters: {},
  sortBy: "id",
  sortOrder: "asc",
  timestamp: Date.now(),
};

/**
 * A DEPENDENCY FOR USE CASES.
 */
export const createPaginatedUseCase = <
  T extends { id: string },
  R extends { id: string },
>(
  repository: ReturnType<typeof createPaginatedRepository<T>>,
  logger: Logger,
  options: PaginationOptions,
  transformItem: (item: T) => R,
) => {
  return {
    findPaginated: async (
      cursor?: string,
      additionalFilters: Record<string, string | number | boolean> = {},
    ): Promise<PaginatedResult<R>> => {
      logger.info({ cursor, additionalFilters }, "start findPaginated");

      // Create cursor data from parameters or use existing cursor
      let cursorData: CursorData | null = null;
      try {
        cursorData = cursor ? decodeCursor(cursor) : defaultCursorData;
      } catch (error) {
        logger.error({ error }, "Invalid cursor");
        cursorData = defaultCursorData;
      }
      cursorData = { ...cursorData, ...options };
      const { items, totalCount } = await repository.findPaginated(cursorData);

      const hasMore = items.length > cursorData.limit;
      const paginatedItems = items.slice(0, cursorData.limit); // `items` may contain one more item than the limit. Trim it.

      const nextCursor =
        hasMore && paginatedItems.length > 0 && cursorData
          ? createNextCursor(
              cursorData,
              paginatedItems[paginatedItems.length - 1]?.id,
            )
          : undefined;

      const previousCursor =
        cursor && paginatedItems.length > 0 && cursorData
          ? createPreviousCursor(cursorData, paginatedItems[0]?.id)
          : undefined;

      logger.info(
        {
          totalCount,
          itemsCount: paginatedItems.length,
          hasMore,
          hasNextCursor: !!nextCursor,
          hasPreviousCursor: !!previousCursor,
        },
        "end findPaginated",
      );

      return {
        data: paginatedItems.map(transformItem),
        meta: {
          nextCursor,
          previousCursor,
          hasMore,
          totalRowCount: totalCount,
        },
      };
    },
  };
};

const cursorSchema = z.object({
  // Position
  column: z.string(),
  id: z.string(),

  // Pagination
  limit: z.number().int().positive(),
  direction: z.enum(["next", "prev"]),

  // Search and Filters
  search: z.string().optional(),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),

  // Sorting
  sortBy: z.string(),
  sortOrder: z.enum(["asc", "desc"]),

  // Timestamp
  timestamp: z.number(),
});

export type CursorData = z.infer<typeof cursorSchema>;

export const encodeCursor = (data: CursorData): string => {
  return Buffer.from(JSON.stringify(data)).toString("base64");
};

export const decodeCursor = (cursor: string): CursorData => {
  const decoded = Buffer.from(cursor, "base64").toString("utf-8");
  const data = JSON.parse(decoded);
  return cursorSchema.parse(data);
};

export const createNextCursor = (
  currentCursor: CursorData,
  lastItemId: string,
): string => {
  const cursorData: CursorData = {
    ...currentCursor,
    column: currentCursor.sortBy,
    id: lastItemId,
    direction: "next",
    timestamp: Date.now(),
  };
  return encodeCursor(cursorData);
};

export const createPreviousCursor = (
  currentCursor: CursorData,
  firstItemId: string,
): string => {
  const cursorData: CursorData = {
    ...currentCursor,
    column: currentCursor.sortBy,
    id: firstItemId,
    direction: "prev",
    timestamp: Date.now(),
  };
  return encodeCursor(cursorData);
};
