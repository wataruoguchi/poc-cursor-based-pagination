import { faker } from "@faker-js/faker";
import type { Kysely } from "kysely";

export async function seed(db: Kysely<any>): Promise<void> {
  await db
    .insertInto("product")
    .values(
      Array.from({ length: 105 }, () => ({
        id: faker.string.uuid(),
        product_name: faker.commerce.productName(),
      })),
    )
    .execute();
}
