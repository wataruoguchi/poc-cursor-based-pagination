import type { DBClient } from "@/infrastructure/database.js";
import type { Logger } from "@/infrastructure/logger.js";
import {
  sql,
  type ComparisonOperatorExpression,
  type ExpressionBuilder,
  type Generated,
  type OrderByDirectionExpression,
} from "kysely";
import type { DB } from "kysely-codegen";
import type { BaseRecord, CursorData } from "./usecase.ts";

type QueryBuilder = ReturnType<DBClient["selectFrom"]>;

/**
 * Utility type to extract actual data types from Kysely table types.
 * Removes Generated<T> wrapper to get the actual runtime types.
 *
 * @example
 * type UserTable = { id: Generated<string>; name: string; age: Generated<number> };
 * type UserData = ExtractDataTypes<UserTable>; // { id: string; name: string; age: number }
 */
export type ExtractDataTypes<T> = {
  [K in keyof T]: T[K] extends Generated<infer U> ? U : T[K];
};

/**
 * Type utility to extract string keys from a type.
 *
 * @example
 * When you have a type like this:
 *
 * ```ts
 * type User = {
 *   id: string;
 *   name: string;
 *   email: string;
 *   numeric_column: number;
 * };
 * ```
 *
 * Then, you can use the `StringTypeColumnName` type to get the string keys:
 *
 * ```ts
 * type StringTypeColumnName<User> = 'id' | 'name' | 'email';
 * ```
 */
type StringTypeColumnName<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

/**
 * A DEPENDENCY FOR REPOSITORIES.
 *
 * This function is used to create a paginated query builder.
 *
 * It infers the table type from the query builder and automatically
 * extracts string columns for search functionality.
 *
 * To properly check the textSearchableColumns, we have to use the `StringTypeColumnName` type.
 * `StringTypeColumnName` depends on the type of the query builder.
 *
 * @example
 * When you have a table like this:
 *
 * ```ts
 * type Users = {
 *   id: string;
 *   name: string;
 *   email: string;
 *   numeric_column: number;
 * };
 * ```
 *
 * When you have a query builder like this:
 *
 * ```ts
 * const query = db.selectFrom('users');
 * ```
 *
 * NOTE: The query will be executed with `.selectAll()`.
 *
 * Then, withTextSearchableColumns will accept the following string keys:
 *
 * ```ts
 * ['id', 'name', 'email']
 * ```
 *
 * NOTE: `numeric_column` will be denied. You will see a type error.
 *
 * So, you use this function like this:
 *
 * ```ts
 * const { items, totalCount, hasMore } = createPaginatedQuery(query).withTextSearchableColumns(['id', 'name', 'email']).paginatedQuery({
 *   columns: {
 *     id: null,
 *   },
 *   direction: 'next',
 *   limit: 10,
 *   filters: {
 *     name: 'John',
 *     email: 'john@example.com',
 *   },
 * });
 * ```
 *
 * @param query - The query builder to use. It should NOT have any "orderBy", "select", "selectAll", "limit" or "execute" clauses.
 */
export function createPaginatedQuery<T extends BaseRecord>(
  logger: Logger,
  query: QueryBuilder & { selectAll(): { execute(): Promise<T[]> } },
) {
  // Return a function that accepts searchable columns
  return {
    /**
     * @param textSearchableColumns - Array of column names that support text search (ILIKE). If not provided, search will be disabled.
     */
    withTextSearchableColumns: function withTextSearchableColumns(
      textSearchableColumns: StringTypeColumnName<T>[] = [],
    ) {
      return createPaginatedQueryFromQuery(
        logger,
        query,
        textSearchableColumns,
      );
    },
  };
}

export type PaginatedQuery<T extends BaseRecord> = (
  decodedCursor: CursorData,
) => Promise<{
  items: T[];
  totalCount: number;
  hasMore: boolean;
}>;

/**
 * @param query - The query builder to use. It should NOT have any "orderBy", "selectAll", "limit" or "execute" clauses.
 * @param textSearchableColumns - Array of column names that support text search (ILIKE). If not provided, search will be disabled.
 * @returns A function that can be used to paginate the query.
 * It returns a promise that resolves to an object with the following properties:
 * - items: The paginated items (the result of `selectAll()`).
 * - totalCount: The total count of items.
 * - hasMore: A boolean indicating if there is more data to fetch.
 */
function createPaginatedQueryFromQuery<T extends BaseRecord>(
  logger: Logger,
  query: QueryBuilder,
  textSearchableColumns: StringTypeColumnName<T>[],
): { paginatedQuery: PaginatedQuery<T> } {
  return {
    /**
     * This function is used to paginate the query.
     *
     * @param decodedCursor - The decoded cursor.
     * @returns The paginated items, the total count and a boolean indicating if there is more data to fetch.
     */
    paginatedQuery: async function paginatedQuery(
      decodedCursor: CursorData,
    ): Promise<{
      items: T[];
      totalCount: number;
      hasMore: boolean;
    }> {
      // Apply filters
      const { columns, direction, limit, filters } = decodedCursor;
      logger.info(
        { columns, direction, limit, filters },
        "start paginatedQuery",
      );

      const [comparison, order]: [
        ComparisonOperatorExpression,
        OrderByDirectionExpression,
      ] = direction === "next" ? [">", "asc"] : ["<", "desc"];

      // Build the filtered query by applying conditions sequentially
      const filteredQuery =
        filters && Object.keys(filters).length > 0
          ? Object.entries(filters).reduce((acc, [column, value]) => {
              if (
                (textSearchableColumns as string[]).includes(column) &&
                typeof value === "string" &&
                isDefinedAndNotEmpty(value)
              ) {
                return acc.where(sql.ref(column), "ilike", `%${value}%`);
              }
              if (typeof value === "number" || typeof value === "boolean") {
                return acc.where(sql.ref(column), "=", value);
              }
              return acc;
            }, query)
          : query;

      // Get total count (filters and search are applied)
      const totalCount = await createFetchTotalCount(logger)(filteredQuery);

      // Build cursor query with ORDER BY clauses
      const sortedQuery = Object.keys(columns).reduce((acc, column) => {
        return acc.orderBy(sql.ref(column), order);
      }, filteredQuery);

      const columnsThatAreDefinedAndNotEmpty = Object.keys(columns).filter(
        (column) => isDefinedAndNotEmpty(columns[column]),
      );
      // Build cursor query with WHERE conditions
      const cursorQuery =
        columnsThatAreDefinedAndNotEmpty.length > 0
          ? sortedQuery.where((eb: ExpressionBuilder<DB, keyof DB>) =>
              eb.or(
                columnsThatAreDefinedAndNotEmpty.map((column) =>
                  eb(sql.ref(column), comparison, columns[column]),
                ),
              ),
            )
          : sortedQuery;

      // Execute the main query with limit from cursor or default
      const items = (await cursorQuery
        .limit(limit + 1) // We want to know if there is more data to fetch. To do that, we need to fetch one more item than the limit.
        .selectAll()
        .execute()) as T[];

      const hasMore = items.length > limit;
      const paginatedItems = items.slice(0, limit);

      logger.info(
        { itemsCount: paginatedItems.length, totalCount, hasMore },
        "end paginatedQuery",
      );

      return {
        items: paginatedItems,
        totalCount,
        hasMore,
      };
    },
  };
}

function isDefinedAndNotEmpty(value: string | number | boolean | Date | null) {
  return value !== undefined && value !== null && value !== "";
}

function createFetchTotalCount(logger: Logger) {
  return async function fetchTotalCount(query: QueryBuilder) {
    logger.info("start fetchTotalCount");
    const result = await query
      .select(sql`count(*)`.as("count"))
      .executeTakeFirstOrThrow();
    return Number(result.count);
  };
}
