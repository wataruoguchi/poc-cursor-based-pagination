import { faker } from "@faker-js/faker";
import type { Kysely } from "kysely";

// replace `any` with your database interface.
export async function seed(db: Kysely<any>): Promise<void> {
  const organizationIds = await db
    .insertInto("organization")
    .values(
      Array.from({ length: 10 }, () => ({
        id: faker.string.uuid(),
        name: faker.company.name(),
      })),
    )
    .returning("id")
    .execute();

  const persons = await db.selectFrom("person").selectAll().execute();
  await db
    .insertInto("person_organization")
    .values(
      persons.map((person) => ({
        person_id: person.id,
        organization_id:
          organizationIds[Math.floor(Math.random() * organizationIds.length)]
            .id,
      })),
    )
    .execute();
}
