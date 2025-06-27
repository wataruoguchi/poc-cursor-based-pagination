import { connectDb, getDb, type DBClient } from "@/infrastructure/database";
import { Migrator, sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import pino from "pino";
import { ESMFileMigrationProvider } from "./ESMFileMigrationProvider";

export async function getTestDb<T extends DB>(
  name = "test",
): Promise<Kysely<T>> {
  const logger = getLogger();
  const db = getDb();
  logger.info(`Creating the test database ${name}`);
  await sql`DROP DATABASE IF EXISTS ${sql.id(name)}`.execute(db);
  await sql`CREATE DATABASE ${sql.id(name)}`.execute(db);
  logger.debug("Disconnecting from the main database");
  await db.destroy();

  logger.debug(`Connecting to the test database ${name}`);
  const testDb = connectDb<T>(name);
  logger.debug(`Running migrations for ${name}`);

  // https://github.com/kysely-org/kysely/blob/master/example/test/test-context.ts#L50
  const migrator = new Migrator({
    db: testDb,
    provider: new ESMFileMigrationProvider("../../db/migrations"),
  });

  const { error, results } = await migrator.migrateToLatest();
  for (const it of results ?? []) {
    if (it.status === "Success") {
      logger.debug(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      logger.error(`failed to execute migration "${it.migrationName}"`);
    }
  }

  if (error) {
    logger.error("failed to migrate");
    logger.error(error);
    process.exit(1);
  }
  return testDb;
}

export type { DBClient };

function getLogger() {
  return pino({
    level: "info",
  });
}
