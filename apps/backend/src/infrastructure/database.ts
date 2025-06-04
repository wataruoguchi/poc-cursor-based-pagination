import { env } from "@/shared/utils/env";
import { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";

const sql = postgres({
  host: env.PGHOST,
  port: env.PGPORT,
  database: env.PGDATABASE,
  username: env.PGUSER,
  password: env.PGPASSWORD,
});

export const dialect = new PostgresJSDialect({
  postgres: sql,
});

export function connectDb(name?: string): DBClient {
  return new Kysely<DB>({
    dialect: new PostgresJSDialect({
      postgres: postgres({
        host: env.PGHOST,
        port: env.PGPORT,
        database: name ?? env.PGDATABASE,
        username: env.PGUSER,
        password: env.PGPASSWORD,
      }),
    }),
  });
}
export type DBClient = Kysely<DB>;

const db = connectDb();
export const getDb = (): DBClient => db;
