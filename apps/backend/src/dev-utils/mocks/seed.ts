import type { Product } from "@/modules/product/domain/product.entity";
import { productSchema } from "@/modules/product/domain/product.entity";
import type { User } from "@/modules/user/domain/user.entity";
import { userSchema } from "@/modules/user/domain/user.entity";
import { faker } from "@faker-js/faker";
import type { DBClient } from "../dev-db";
export async function seedUsers(db: DBClient): Promise<User[]> {
  const users = await db
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
    .returningAll()
    .execute();
  return users.map((user) =>
    userSchema.parse({
      ...user,
      createdAt: user.created_at,
    }),
  );
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
