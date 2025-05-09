import type { Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("user")
    .addColumn("email", "varchar(255)", (col) => col.notNull())
    .addColumn("password_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("status", "varchar(255)", (col) => col.notNull())
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("user").dropColumn("email").execute();
  await db.schema.alterTable("user").dropColumn("password_hash").execute();
  await db.schema.alterTable("user").dropColumn("status").execute();
}
