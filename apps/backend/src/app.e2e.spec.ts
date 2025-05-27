import type { Hono } from "hono";
import { getApp } from "./app";
import { type DBClient, getTestDb } from "./dev-utils/dev-db";
import { seedProducts, seedUsers } from "./dev-utils/mocks/seed";
import type { User } from "./modules/user/domain/user.entity";
import { decodeCursor, encodeCursor } from "./shared/utils/pagination";

describe("app", () => {
  let testDb: DBClient;
  let app: Hono;
  let users: User[] = [];
  let products: Awaited<ReturnType<typeof seedProducts>>;

  beforeAll(async () => {
    testDb = await getTestDb("app-spec");
    users = await seedUsers(testDb);
    products = await seedProducts(testDb);
    app = getApp(testDb);
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  describe("app", () => {
    describe("user module", () => {
      describe("GET /api/users", () => {
        test("should return all users", async () => {
          const res = await app.request("/api/users");
          expect(res.status).toBe(200);
          expect(await res.json()).toEqual(JSON.parse(JSON.stringify(users)));
        });
      });
    });

    describe("product module", () => {
      describe("GET /api/products", () => {
        test("should return all products", async () => {
          const res = await app.request("/api/products");
          expect(res.status).toBe(200);
          expect(await res.json()).toEqual(
            JSON.parse(JSON.stringify(products)),
          );
        });
      });

      describe("GET /api/products/paginated", () => {
        let sortedProducts: typeof products;
        beforeEach(() => {
          sortedProducts = products.sort((a, b) => (a.id > b.id ? 1 : -1));
        });

        test("should return 200 without cursor", async () => {
          const res = await app.request("/api/products/paginated");
          expect(res.status).toBe(200);
          const resJson = await res.json();
          expect(resJson).toEqual({
            data: sortedProducts.slice(0, 10),
            meta: {
              hasMore: true,
              nextCursor: expect.any(String),
              previousCursor: undefined,
              totalRowCount: products.length,
            },
          });
        });

        test("should return 200 with invalid cursor", async () => {
          // TODO: We should return 400 instead of 200
          const res = await app.request(
            "/api/products/paginated?cursor=invalid",
          );
          expect(res.status).toBe(200);
          const resJson = await res.json();
          expect(resJson).toEqual({
            data: sortedProducts.slice(0, 10),
            meta: {
              hasMore: true,
              nextCursor: expect.any(String),
              previousCursor: expect.any(String),
              totalRowCount: products.length,
            },
          });
        });

        test("should return 200 with valid cursor", async () => {
          const LIMIT = 3;
          const cursor = encodeCursor({
            column: "id",
            id: "",
            limit: LIMIT,
            direction: "next",
            timestamp: Date.now(),
            filters: {},
            sortBy: "id",
            sortOrder: "asc",
            search: "",
          });
          const res = await app.request(
            `/api/products/paginated?cursor=${cursor}`,
          );
          expect(res.status).toBe(200);
          const resJson = await res.json();
          const {
            meta: { previousCursor, nextCursor },
          } = resJson;

          const decodedPreviousCursor = decodeCursor(previousCursor);
          expect(decodedPreviousCursor.id).toEqual(sortedProducts[0].id);
          const decodedNextCursor = decodeCursor(nextCursor);
          expect(decodedNextCursor.id).toEqual(
            sortedProducts[sortedProducts.slice(0, LIMIT).length - 1].id,
          );

          expect(resJson).toEqual({
            data: sortedProducts.slice(0, LIMIT),
            meta: {
              hasMore: true,
              nextCursor: expect.any(String),
              previousCursor: expect.any(String),
              totalRowCount: products.length,
            },
          });
        });
      });
    });

    describe("shopping cart module", () => {
      describe("GET /api/orders/shopping-cart", () => {
        test("should return a shopping cart", async () => {
          const [user1] = users;
          const res = await app.request("/api/orders/shopping-cart", {
            headers: {
              "X-User-Id": user1.id,
            },
          });
          expect(res.status).toBe(200);
          expect(await res.json()).toEqual({
            id: expect.any(String),
            userId: user1.id,
            items: [],
            status: "Opened",
          });
        });
      });

      describe("POST /api/orders/shopping-cart/items/:itemId", () => {
        test.each([[1], [2]])(
          "should add an item to the shopping cart and return quantity %i",
          async (quantity) => {
            const [user1] = users;

            // Prep - create a shopping cart
            await app.request("/api/orders/shopping-cart", {
              headers: {
                "X-User-Id": user1.id,
              },
            });

            const [product1] = products;
            const res = await app.request(
              `/api/orders/shopping-cart/items/${product1.id}`,
              {
                method: "POST",
                headers: {
                  "X-User-Id": user1.id,
                },
              },
            );
            expect(res.status).toBe(200);
            const shoppingCart = await res.json();
            expect(shoppingCart).toEqual({
              id: expect.any(String),
              userId: user1.id,
              items: [
                {
                  productId: product1.id,
                  productName: product1.name,
                  quantity,
                },
              ],
              status: "Opened",
            });
          },
        );
      });

      describe("DELETE /api/orders/shopping-cart/items/:itemId", () => {
        test("should remove an item to the shopping cart", async () => {
          const [user1] = users;

          // Prep - create a shopping cart
          await app.request("/api/orders/shopping-cart", {
            headers: {
              "X-User-Id": user1.id,
            },
          });

          const [product1] = products;
          const res = await app.request(
            `/api/orders/shopping-cart/items/${product1.id}`,
            {
              method: "DELETE",
              headers: {
                "X-User-Id": user1.id,
              },
            },
          );
          expect(res.status).toBe(200);
          const shoppingCart = await res.json();
          expect(shoppingCart).toEqual({
            id: expect.any(String),
            userId: user1.id,
            items: [
              {
                productId: product1.id,
                productName: product1.name,
                quantity: 1,
              },
            ],
            status: "Opened",
          });
        });
      });

      describe("PUT /api/orders/shopping-cart/close", () => {
        test("should close the shopping cart", async () => {
          const [user1] = users;

          // Prep - create a shopping cart
          await app.request("/api/orders/shopping-cart", {
            headers: {
              "X-User-Id": user1.id,
            },
          });

          const res = await app.request("/api/orders/shopping-cart/close", {
            method: "PUT",
            headers: {
              "X-User-Id": user1.id,
            },
          });
          expect(res.status).toBe(200);
          const { shoppingCart, user } = await res.json();

          const [product1] = products;
          expect(shoppingCart).toEqual({
            id: expect.any(String),
            userId: user1.id,
            items: [
              {
                productId: product1.id,
                productName: product1.name,
                quantity: 1,
              },
            ],
            status: "Closed",
          });
          expect(user).toEqual({
            id: user1.id,
            name: user1.name,
            email: user1.email,
            status: "active",
            createdAt: expect.any(String),
          });
        });
      });
    });
  });
});
