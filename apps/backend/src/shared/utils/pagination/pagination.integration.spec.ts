import { getTestDb } from "@/dev-utils/dev-db";
import { createLogger } from "@/infrastructure/logger";
import { faker } from "@faker-js/faker";
import {
  sql,
  type Generated,
  type Kysely,
  type SelectQueryBuilder,
} from "kysely";
import type { DB } from "kysely-codegen";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPaginatedQuery, type ExtractDataTypes } from "./repository";
import {
  createPaginatedUseCase,
  decodeCursor,
  getDefaultCursorData,
} from "./usecase";

// Use Kysely's table type directly
type TestDB = DB & {
  test_table: {
    id: Generated<number>;
    uuid: Generated<string>;
    name: string;
    created_at: Generated<Date>;
  };
};

// Extract actual data types using the utility type
type TestTableData = ExtractDataTypes<TestDB["test_table"]>;

describe("Pagination Integration Tests", () => {
  let db: Kysely<TestDB>;
  let logger: ReturnType<typeof createLogger>;

  beforeAll(async () => {
    db = await getTestDb<TestDB>("pagination-integration-spec");
    logger = createLogger("pagination-integration-test");

    await db.transaction().execute(async (trx) => {
      await trx.schema
        .createTable("test_table")
        .addColumn("id", "integer", (col) =>
          col.notNull().generatedAlwaysAsIdentity().primaryKey(),
        )
        .addColumn("uuid", "uuid", (col) =>
          col.notNull().defaultTo(sql`gen_random_uuid()`),
        )
        .addColumn("name", "text")
        .addColumn("created_at", "timestamptz", (col) =>
          col.notNull().defaultTo(sql`now()`),
        )
        .execute();
      await trx.schema
        .createIndex("test_table_uuid_index")
        .on("test_table")
        .column("uuid")
        .execute();
      await trx.schema
        .createIndex("test_table_created_at_index")
        .on("test_table")
        .column("created_at")
        .execute();
      await trx
        .insertInto("test_table")
        .values([
          ...Array.from({ length: 100 }, () => ({
            name: faker.person.fullName(),
            created_at: new Date(),
          })),
        ])
        .execute();
    });
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe("createPaginatedUseCase Integration", () => {
    describe("initialization", () => {
      it("should create a paginated use case with default cursor", () => {
        const paginatedQuery = createPaginatedQuery(
          logger,
          getBaseQuery(db),
        ).withTextSearchableColumns(["name"]);

        const useCase = createPaginatedUseCase(
          logger,
          paginatedQuery.paginatedQuery,
          (item) => ({ ...item }),
        );

        expect(useCase).toHaveProperty("paginatedUseCase");
        expect(typeof useCase.paginatedUseCase).toBe("function");
      });
    });

    /**
     * This test is to make sure that the pagination works with different column types.
     * id: integer
     * uuid: uuid
     */
    describe.each([{ key: "id" }, { key: "uuid" }])(
      "real use cases $key",
      ({ key }) => {
        let useCase: ReturnType<typeof createPaginatedUseCase>;
        let firstPageExpectedData: TestTableData[];
        let secondPageExpectedData: TestTableData[];
        let thirdPageExpectedData: TestTableData[];
        let expectedDataLength: number;

        beforeAll(async () => {
          const expectedDataSource = await db
            .selectFrom("test_table")
            .selectAll()
            .orderBy("created_at", "asc")
            .orderBy(sql.ref(key), "asc")
            .execute();
          expectedDataLength = expectedDataSource.length;
          firstPageExpectedData = [...expectedDataSource].slice(0, 10);
          secondPageExpectedData = [...expectedDataSource].slice(10, 20);
          thirdPageExpectedData = [...expectedDataSource].slice(20, 30);
        });

        beforeEach(() => {
          const paginatedQuery = createPaginatedQuery(
            logger,
            getBaseQuery(db),
          ).withTextSearchableColumns(["name"]);

          useCase = createPaginatedUseCase(
            logger,
            paginatedQuery.paginatedQuery,
            (item) => ({ ...item }),
            {
              ...getDefaultCursorData(),
              orderBy: ["created_at", key],
              cursorValues: {},
            },
          );
        });

        describe("first page (with no cursor)", () => {
          let nextCursorFromFirstPage: string | undefined;

          it("should return the first page", async () => {
            const { data, meta } = await useCase.paginatedUseCase();
            // 1 - 10
            expect(data).toEqual(firstPageExpectedData);

            expect(meta.nextCursor).toBeDefined();
            expect(meta.previousCursor).not.toBeDefined();
            nextCursorFromFirstPage = meta.nextCursor;

            expect(meta.hasMore).toBe(true);
            expect(meta.totalRowCount).toBe(expectedDataLength);
          });

          describe("next page (Go to page 2)", () => {
            let nextCursorFromSecondPage: string | undefined;
            let previousCursorFromSecondPage: string | undefined;

            it("should return the next page", async () => {
              expect(nextCursorFromFirstPage).toBeDefined();
              const { data, meta } = await useCase.paginatedUseCase(
                nextCursorFromFirstPage,
              );
              // 11 - 20
              expect(data).toEqual(secondPageExpectedData);

              expect(meta.nextCursor).toBeDefined();
              expect(meta.previousCursor).toBeDefined();
              nextCursorFromSecondPage = meta.nextCursor;
              previousCursorFromSecondPage = meta.previousCursor;

              expect(meta.hasMore).toBe(true);
              expect(meta.totalRowCount).toBe(expectedDataLength);
            });

            describe("next page (Go to page 3)", () => {
              let previousCursorFromThirdPage: string | undefined;

              it("should return the next page", async () => {
                expect(nextCursorFromSecondPage).toBeDefined();
                const { data, meta } = await useCase.paginatedUseCase(
                  nextCursorFromSecondPage,
                );
                // 21 - 30
                expect(data).toEqual(thirdPageExpectedData);

                expect(meta.nextCursor).toBeDefined();
                expect(meta.previousCursor).toBeDefined();
                previousCursorFromThirdPage = meta.previousCursor;

                expect(meta.hasMore).toBe(true);
                expect(meta.totalRowCount).toBe(expectedDataLength);
              });

              // biome-ignore lint/complexity/noExcessiveNestedTestSuites: <explanation>
              describe("previous page (Back to page 2)", () => {
                it("should return the previous page", async () => {
                  expect(previousCursorFromThirdPage).toBeDefined();
                  const { data, meta } = await useCase.paginatedUseCase(
                    previousCursorFromThirdPage,
                  );
                  // 20 - 11
                  expect(data).toEqual(secondPageExpectedData.reverse());

                  expect(meta.nextCursor).toBeDefined();
                  expect(meta.previousCursor).toBeDefined();

                  expect(meta.hasMore).toBe(true);
                  expect(meta.totalRowCount).toBe(expectedDataLength);

                  // Check if the next cursor is consistent.
                  expect(previousCursorFromSecondPage).toBeDefined();
                  if (!previousCursorFromSecondPage || !meta.nextCursor) {
                    throw new Error("Expected cursors to be defined");
                  }
                  const decodedPreviousCursorFromSecondPage = decodeCursor(
                    previousCursorFromSecondPage,
                  );
                  const decodedNextCursorFromMeta = decodeCursor(
                    meta.nextCursor,
                  );
                  const mockTimestamp = new Date();
                  expect({
                    ...decodedPreviousCursorFromSecondPage,
                    timestamp: mockTimestamp,
                  }).toMatchObject({
                    ...decodedNextCursorFromMeta,
                    direction: "prev",
                    timestamp: mockTimestamp,
                  });
                });
              });
            });

            describe("previous page (Back to page 1)", () => {
              it("should return the previous page", async () => {
                expect(previousCursorFromSecondPage).toBeDefined();
                const { data, meta } = await useCase.paginatedUseCase(
                  previousCursorFromSecondPage,
                );
                // 10 - 1
                expect(data).toEqual(firstPageExpectedData.reverse());

                // Hit the first page, so there is no next cursor.
                expect(meta.nextCursor).not.toBeDefined();
                expect(meta.previousCursor).toBeDefined();

                // Hit the first page, so there is no more data.
                expect(meta.hasMore).toBe(false);
                expect(meta.totalRowCount).toBe(expectedDataLength);
              });
            });
          });
        });
      },
    );
  });
});

function getBaseQuery(
  db: Kysely<TestDB>,
): SelectQueryBuilder<TestDB, "test_table", Record<string, never>> {
  return db.selectFrom("test_table");
}
