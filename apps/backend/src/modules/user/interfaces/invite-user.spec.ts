import { createLogger } from "@/infrastructure/logger";
import { env } from "@/shared/utils/env";
import { Hono } from "hono";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createInviteUserRoute } from "./invite-user";

const logger = createLogger("test");

const server = setupServer(
  // Mock Auth0 token endpoint
  http.post("https://test.auth0.com/oauth/token", () => {
    return HttpResponse.json({
      access_token: "test-access-token",
      expires_in: 86400,
      token_type: "Bearer",
    });
  }),

  // Mock Auth0 invitation endpoint
  http.post(
    `https://test.auth0.com/api/v2/organizations/${env.PRIMARY_ORGANIZATION_ID}/invitations`,
    () => {
      return new HttpResponse(null, { status: 201 });
    },
  ),
);

describe("POST /api/users", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return 201 when invitation is successful", async () => {
    const app = new Hono();
    const inviteUser = async () => ({ success: true });
    const route = createInviteUserRoute(logger, inviteUser);
    app.post(route.path, route.handler);

    const res = await app.request(route.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
      }),
    });

    expect(res.status).toBe(201);
  });

  it("should return 500 when invitation fails", async () => {
    const app = new Hono();
    const inviteUser = async () => ({
      success: false,
      error: "Failed to invite user",
    });
    const route = createInviteUserRoute(logger, inviteUser);
    app.post(route.path, route.handler);

    const res = await app.request(route.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
      }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to invite user" });
  });

  it("should return 400 for invalid input", async () => {
    const app = new Hono();
    const inviteUser = async () => ({ success: true });
    const route = createInviteUserRoute(logger, inviteUser);
    app.post(route.path, route.handler);

    const res = await app.request(route.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: "invalid-uuid",
        email: "invalid-email",
      }),
    });

    expect(res.status).toBe(400);
  });
});
