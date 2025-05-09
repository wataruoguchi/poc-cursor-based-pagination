import { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";

const sql = postgres({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

export const dialect = new PostgresJSDialect({
  postgres: sql,
});

const db = new Kysely<DB>({
  dialect,
});

export type DBClient = typeof db;
export const getDB = (): DBClient => db;
