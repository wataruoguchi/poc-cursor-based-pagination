import type { Logger } from "@/infrastructure/logger.js";
import {
  sql,
  type ComparisonOperatorExpression,
  type Generated,
  type OrderByDirectionExpression,
  type SelectQueryBuilder,
} from "kysely";
import type { BaseRecord, CursorData } from "./usecase.ts";

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

const EXTRA_ITEM_FOR_PAGINATION = 1;

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
 *   cursorValues: {
 *     id: null,
 *     created_at: null,
 *   },
 *   orderBy: ['created_at', 'id'],
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
export function createPaginatedQuery<
  T extends BaseRecord,
  TDB extends Record<string, unknown> = Record<string, unknown>,
>(
  logger: Logger,
  query: SelectQueryBuilder<TDB, string, Record<string, unknown>> & {
    selectAll(): { execute(): Promise<T[]> };
  },
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
function createPaginatedQueryFromQuery<
  T extends BaseRecord,
  TDB extends Record<string, unknown> = Record<string, unknown>,
>(
  logger: Logger,
  query: SelectQueryBuilder<TDB, string, Record<string, unknown>>,
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
      const { cursorValues, orderBy, direction, limit, filters } =
        decodedCursor;
      logger.info(
        { cursorValues, orderBy, direction, limit, filters },
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
      const sortedQuery = orderBy.reduce((acc, column) => {
        return acc.orderBy(sql.ref(column), order);
      }, filteredQuery);

      // Build cursor query with WHERE conditions
      const cursorQuery =
        cursorValues &&
        Object.keys(cursorValues).length > 0 &&
        orderBy.length > 0
          ? buildCursorWhereCondition(
              sortedQuery,
              orderBy,
              cursorValues,
              comparison,
            )
          : sortedQuery;

      const mainQuery = cursorQuery
        .limit(limit + EXTRA_ITEM_FOR_PAGINATION)
        .selectAll(); // We want to know if there is more data to fetch. To do that, we need to fetch one more item than the limit.

      // Execute the main query with limit from cursor or default
      const items = (await mainQuery.execute()) as T[];

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

  function buildCursorWhereCondition(
    query: SelectQueryBuilder<TDB, string, Record<string, unknown>>,
    orderBy: string[],
    cursorValues: Record<string, string | number | boolean | Date | null>,
    comparison: ComparisonOperatorExpression,
  ): SelectQueryBuilder<TDB, string, Record<string, unknown>> {
    const columnValues = orderBy
      .filter((columnName) => isDefinedAndNotEmpty(cursorValues[columnName]))
      .map((columnName) => ({
        column: columnName,
        value: cursorValues[columnName],
      }));

    if (columnValues.length === 0) {
      return query;
    }

    if (columnValues.length === 1) {
      // Single column case
      const { column, value } = columnValues[0];
      return query.where(sql.ref(column), comparison, value);
    }

    // Multi-column case - build compound condition efficiently
    // For [col1, col2, col3] and cursor (val1, val2, val3), build:
    // (col1 > val1) OR (col1 = val1 AND col2 > val2) OR (col1 = val1 AND col2 = val2 AND col3 > val3)
    return query.where((eb) => {
      const conditions = [];
      const accumulatedEqualityConditions: ReturnType<typeof eb>[] = [];

      // Single pass through all columns - O(n) complexity
      for (let i = 0; i < columnValues.length; i++) {
        const { column, value } = columnValues[i];

        // Add the comparison condition for the current column
        const comparisonCondition = eb(sql.ref(column), comparison, value);

        // Combine with accumulated equality conditions
        if (accumulatedEqualityConditions.length > 0) {
          conditions.push(
            eb.and([...accumulatedEqualityConditions, comparisonCondition]),
          );
        } else {
          conditions.push(comparisonCondition);
        }

        // Add current column's equality condition for next iteration
        accumulatedEqualityConditions.push(eb(sql.ref(column), "=", value));
      }

      // @ts-ignore
      return eb.or(conditions);
    });
  }
}

function isDefinedAndNotEmpty(value: string | number | boolean | Date | null) {
  return value !== undefined && value !== null && value !== "";
}

function createFetchTotalCount(logger: Logger) {
  return async function fetchTotalCount<
    TDB extends Record<string, unknown> = Record<string, unknown>,
  >(query: SelectQueryBuilder<TDB, string, Record<string, unknown>>) {
    logger.info("start fetchTotalCount");
    const result = await query
      .select(sql`count(*)`.as("count"))
      .executeTakeFirstOrThrow();
    return Number(result.count);
  };
}
