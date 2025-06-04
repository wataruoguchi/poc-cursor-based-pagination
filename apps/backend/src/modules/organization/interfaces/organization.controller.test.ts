import { createLogger } from "@/infrastructure/logger";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createOrganizationController } from "./organization.controller";

const logger = createLogger("test");

describe("GET /api/organizations", () => {
  it("should return list of organizations", async () => {
    const mockOrganizations = [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Organization 1",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174001",
        name: "Test Organization 2",
      },
    ];

    const app = new Hono();
    const getAllOrganizations = async () => mockOrganizations;
    app.route(
      "/api/organizations",
      createOrganizationController({ getAllOrganizations }, logger),
    );

    const res = await app.request("/api/organizations", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockOrganizations);
  });

  it("should return empty array when no organizations exist", async () => {
    const app = new Hono();
    const getAllOrganizations = async () => [];
    app.route(
      "/api/organizations",
      createOrganizationController({ getAllOrganizations }, logger),
    );

    const res = await app.request("/api/organizations", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
