import type { DBClient } from "@/infrastructure/database";
import type { Product } from "@/modules/product/domain/product.entity";
import { productSchema } from "@/modules/product/domain/product.entity";
import type { User } from "@/modules/user/domain/user.entity";
import { userSchema } from "@/modules/user/domain/user.entity";
import { faker } from "@faker-js/faker";

export async function seedUsers(db: DBClient): Promise<User[]> {
  const users = [
    {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      status: "active" as const,
      password_hash: "hashed_password",
      created_at: faker.date.recent(),
    },
    {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      status: "active" as const,
      password_hash: "hashed_password",
      created_at: faker.date.recent(),
    },
  ];

  await db.insertInto("person").values(users).execute();
  return users.map((user) =>
    userSchema.parse({
      ...user,
      createdAt: user.created_at,
    }),
  );
}

export async function seedOrganizations(db: DBClient) {
  const organizations = [
    {
      id: faker.string.uuid(),
      name: faker.company.name(),
    },
    {
      id: faker.string.uuid(),
      name: faker.company.name(),
    },
  ];

  await db.insertInto("organization").values(organizations).execute();
  return organizations;
}

export async function seedProducts(db: DBClient): Promise<Product[]> {
  const products = await db
    .insertInto("product")
    .values(
      Array.from({ length: 105 }, () => ({
        id: faker.string.uuid(),
        product_name: faker.commerce.productName(),
      })),
    )
    .returningAll()
    .execute();

  return products.map((product) =>
    productSchema.parse({
      ...product,
      name: product.product_name,
    }),
  );
}
