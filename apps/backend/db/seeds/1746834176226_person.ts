import { faker } from "@faker-js/faker";
import type { Kysely } from "kysely";

// replace `any` with your database interface.
export async function seed(db: Kysely<any>): Promise<void> {
  await db
    .insertInto("person")
    .values(
      Array.from({ length: 10 }, () => ({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        status: "active",
        password_hash: faker.internet.password(),
        created_at: faker.date.past(),
      })),
    )
    .execute();
}
