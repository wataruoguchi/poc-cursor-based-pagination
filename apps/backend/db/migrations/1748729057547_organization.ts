import { type Kysely, sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("organization")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createTable("person_organization")
    .addColumn("person_id", "uuid", (col) => col.notNull())
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organization.id"),
    )
    .addForeignKeyConstraint(
      "person_organization_fk",
      ["person_id"],
      "person",
      ["id"],
    )
    .addForeignKeyConstraint(
      "organization_person_fk",
      ["organization_id"],
      "organization",
      ["id"],
    )
    .addPrimaryKeyConstraint("person_organization_pk", [
      "person_id",
      "organization_id",
    ])
    .addColumn("created_at", "timestamp", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("person_organization").execute();
  await db.schema.dropTable("organization").execute();
}
