describe("dummy", () => {
  it("should be defined", () => {
    expect(1).toBeDefined();
  });
});
import { getTestDb } from "@/dev-utils/dev-db";
import { createLogger, type Logger } from "@/infrastructure/logger";
import { sql, type Generated, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPaginatedQuery, type ExtractDataTypes } from "./repository";
import type { CursorData } from "./usecase";

// Extend the DB type to include our test table
type TestDB = DB & {
  test_table: {
    sequential_id: Generated<number>;
    uuid_id: Generated<string>;
    created_at: Generated<Date>;
    name: string;
    age: number;
    is_active: boolean;
  };
};

// Extract actual data types using the utility type
type TestTableData = ExtractDataTypes<TestDB["test_table"]>;

describe("Pagination Repository", () => {
  let db: Kysely<TestDB>;
  let usersStored: TestTableData[];
  let logger: Logger;

  beforeAll(async () => {
    // Cast the database to our extended type since we're adding a test table
    db = await getTestDb<TestDB>("pagination-repository-spec");
    logger = createLogger("test");

    await db.schema
      .createTable("test_table")
      .addColumn("sequential_id", "integer", (col) =>
        col.notNull().generatedAlwaysAsIdentity().primaryKey(),
      )
      .addColumn("uuid_id", "uuid", (col) =>
        col.notNull().defaultTo(sql`gen_random_uuid()`),
      )
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`),
      )
      .addColumn("name", "text")
      .addColumn("age", "integer")
      .addColumn("is_active", "boolean")
      .execute();

    await db.schema
      .createIndex("test_table_created_at_index")
      .on("test_table")
      .column("created_at")
      .execute();

    const oldCreatedAt = new Date("2025-01-01T00:00:00.000Z");
    await db
      .insertInto("test_table")
      .values([
        {
          name: "Wataru Oguchi",
          age: 38,
          is_active: false,
          created_at: oldCreatedAt,
        },
        {
          name: "Chris Pratt",
          age: 21,
          is_active: true,
          created_at: oldCreatedAt,
        },
        {
          name: "Chris Evans",
          age: 20,
          is_active: true,
          created_at: oldCreatedAt,
        },
        {
          name: "Christopher Nolan",
          age: 20,
          is_active: true,
          created_at: oldCreatedAt,
        },
        {
          name: "Christopher Lee",
          age: 20,
          is_active: true,
          created_at: oldCreatedAt,
        },
        ...Array.from({ length: 20 }, (_, i) => ({
          name: `Test ${i}`,
          age: 20,
          is_active: true,
        })),
      ])
      .execute();

    usersStored = await db
      .selectFrom("test_table")
      .selectAll()
      .orderBy("created_at", "asc")
      .orderBy("sequential_id", "asc")
      .execute();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe("createPaginatedQuery", () => {
    it("should create a paginated query function", () => {
      const paginatedQuery = createPaginatedQuery(
        logger,
        getBaseQuery(db),
      ).withTextSearchableColumns(["name"]);

      expect(paginatedQuery).toHaveProperty("paginatedQuery");
      expect(typeof paginatedQuery.paginatedQuery).toBe("function");
    });

    it("should execute pagination with cursor", async () => {
      const cursor: CursorData = {
        columns: {
          created_at: null,
          sequential_id: null,
        },
        limit: 5,
        direction: "next",
        filters: {},
        timestamp: Date.now(),
      };
      const expectedItems = [...usersStored].slice(0, cursor.limit);

      const result = await createPaginatedQuery(logger, getBaseQuery(db))
        .withTextSearchableColumns()
        .paginatedQuery(cursor);

      expect(result).toEqual({
        items: expect.any(Array),
        totalCount: usersStored.length,
        hasMore: true,
      });

      expect(result.items).toHaveLength(cursor.limit);
      expect(result.items).toEqual(expectedItems);
    });

    describe("focus on filters", () => {
      it("should apply search filter when filters are provided [name]:", async () => {
        const LIMIT = 10;
        const cursor: CursorData = {
          columns: {
            created_at: null,
            sequential_id: null,
          },
          limit: LIMIT,
          direction: "next",
          filters: { name: "Chris" },
          timestamp: Date.now(),
        };
        const expectedItems = [...usersStored]
          .filter((user) => user.name.includes("Chris"))
          .slice(0, LIMIT);

        const result = await createPaginatedQuery(logger, getBaseQuery(db))
          .withTextSearchableColumns(["name"])
          .paginatedQuery(cursor);

        expect(result.items).toEqual(expectedItems);
      });

      it("should apply search filter when filters are provided [age]:", async () => {
        const LIMIT = 10;
        const cursor: CursorData = {
          columns: {
            created_at: null,
            sequential_id: null,
          },
          limit: LIMIT,
          direction: "next",
          filters: { age: 20 },
          timestamp: Date.now(),
        };
        const expectedItems = [...usersStored]
          .filter((user) => user.age === 20)
          .slice(0, LIMIT);

        const result = await createPaginatedQuery(logger, getBaseQuery(db))
          .withTextSearchableColumns(["name"])
          .paginatedQuery(cursor);

        expect(result.items).toEqual(expectedItems);
      });

      it("should apply search filter when filters are provided [age, name]:", async () => {
        const LIMIT = 10;
        const cursor: CursorData = {
          columns: {
            created_at: null,
            sequential_id: null,
          },
          limit: LIMIT,
          direction: "next",
          filters: { age: 20, name: "Chris" },
          timestamp: Date.now(),
        };
        const expectedItems = [...usersStored]
          .filter((user) => user.age === 20 && user.name.includes("Chris"))
          .slice(0, LIMIT);

        const result = await createPaginatedQuery(logger, getBaseQuery(db))
          .withTextSearchableColumns(["name"])
          .paginatedQuery(cursor);

        expect(result.items).toEqual(expectedItems);
      });
    });

    describe("focus on sorting", () => {
      it("should apply column sorting when the value is provided", async () => {
        const LIMIT = 5;
        // Get first user ID to use as cursor
        const [firstUser, ...restUsers] = await db
          .selectFrom("test_table")
          .orderBy("created_at", "asc")
          .orderBy("sequential_id", "asc")
          .selectAll()
          .execute();
        expect(firstUser).toBeDefined();
        const expectedItems = [...restUsers].slice(0, LIMIT);

        const cursor: CursorData = {
          columns: {
            created_at: firstUser.created_at,
            sequential_id: firstUser.sequential_id,
          },
          limit: LIMIT,
          direction: "next",
          filters: {},
          timestamp: Date.now(),
        };

        const result = await createPaginatedQuery(logger, getBaseQuery(db))
          .withTextSearchableColumns()
          .paginatedQuery(cursor);

        expect(result.items).toEqual(expectedItems);
      });

      it("should apply id filter when id is provided, even with a different column", async () => {
        const LIMIT = 5;
        const ORDER_BY_COLUMN = "uuid_id";
        // Get first user ID to use as cursor
        const [firstUser, ...restUsers] = await db
          .selectFrom("test_table")
          .orderBy("created_at", "asc")
          .orderBy(ORDER_BY_COLUMN, "asc")
          .selectAll()
          .execute();
        expect(firstUser).toBeDefined();
        const expectedItems = [...restUsers].slice(0, LIMIT);

        const cursor: CursorData = {
          columns: {
            created_at: firstUser.created_at,
            [ORDER_BY_COLUMN]: firstUser[ORDER_BY_COLUMN],
          },
          limit: LIMIT,
          direction: "next",
          filters: {},
          timestamp: Date.now(),
        };

        const result = await createPaginatedQuery(logger, getBaseQuery(db))
          .withTextSearchableColumns()
          .paginatedQuery(cursor);

        expect(result.items).toEqual(
          expectedItems.map((user) => ({
            ...user,
          })),
        );
      });

      it('should apply both filters and "cursor" [name, is_active]', async () => {
        const LIMIT = 5;
        const ORDER_BY_COLUMN = "name";
        // Get first user to use as cursor
        const [firstUser, ...restUsers] = await db
          .selectFrom("test_table")
          .orderBy("created_at", "asc")
          .orderBy(ORDER_BY_COLUMN, "asc")
          .where("name", "ilike", "%Chris%")
          .where("is_active", "=", true)
          .selectAll()
          .execute();
        expect(firstUser).toBeDefined();
        const expectedItems = [...restUsers].slice(0, LIMIT);

        // Total count includes the first user because we are paginating after it.
        const expectedTotalCount = [...usersStored].filter(
          (user) => user.name.includes("Chris") && user.is_active,
        ).length;

        const cursor: CursorData = {
          columns: {
            created_at: firstUser.created_at,
            [ORDER_BY_COLUMN]: firstUser[ORDER_BY_COLUMN],
          },
          limit: LIMIT,
          direction: "next",
          filters: { name: "Chris", is_active: true },
          timestamp: Date.now(),
        };

        const result = await createPaginatedQuery(logger, getBaseQuery(db))
          .withTextSearchableColumns(["name"])
          .paginatedQuery(cursor);

        expect(result).toEqual({
          items: expect.any(Array),
          totalCount: expectedTotalCount,
          hasMore: false,
        });
        expect(result.items.length).toBe(expectedItems.length);
        expect(result.items).toEqual(
          expectedItems.map((user) => ({
            ...user,
          })),
        );
      });
    });

    it("should handle previous direction pagination", async () => {
      const LIMIT = 5;
      const ORDER_BY_COLUMN = "uuid_id";

      // Get a user ID to use as cursor
      const [firstUser, ...restUsers] = await db
        .selectFrom("test_table")
        .orderBy("created_at", "desc")
        .orderBy(ORDER_BY_COLUMN, "desc")
        .selectAll()
        .execute();
      expect(firstUser).toBeDefined();
      const expectedItems = [...restUsers].slice(0, LIMIT);

      const cursor: CursorData = {
        columns: {
          created_at: firstUser.created_at,
          [ORDER_BY_COLUMN]: firstUser[ORDER_BY_COLUMN],
        },
        limit: LIMIT,
        direction: "prev",
        filters: {},
        timestamp: Date.now(),
      };

      const result = await createPaginatedQuery(logger, getBaseQuery(db))
        .withTextSearchableColumns()
        .paginatedQuery(cursor);

      expect(result.items).toEqual(expectedItems);
    });

    it("should handle hasMore correctly when no more items exist", async () => {
      const cursor: CursorData = {
        columns: {
          sequential_id: null,
        },
        limit: 1000,
        direction: "next",
        filters: {},
        timestamp: Date.now(),
      };

      const result = await createPaginatedQuery(logger, getBaseQuery(db))
        .withTextSearchableColumns()
        .paginatedQuery(cursor);

      expect(result.hasMore).toBe(false);
      expect(result.totalCount).toBe(usersStored.length);
      expect(result.items.length).toBe(usersStored.length);
      expect(result.items).toEqual(
        usersStored.map((user) => ({
          ...user,
        })),
      );
    });

    it("should handle empty result set", async () => {
      const cursor: CursorData = {
        columns: {
          sequential_id: null,
        },
        limit: 10,
        direction: "next",
        filters: {},
        timestamp: Date.now(),
      };

      const result = await createPaginatedQuery(
        logger,
        db.selectFrom("test_table").where("uuid_id", "=", crypto.randomUUID()),
      )
        .withTextSearchableColumns()
        .paginatedQuery(cursor);

      expect(result).toEqual({
        items: [],
        totalCount: 0,
        hasMore: false,
      });
    });
  });
});

function getBaseQuery(db: Kysely<TestDB>) {
  return db.selectFrom("test_table");
}
