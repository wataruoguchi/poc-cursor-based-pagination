import { createLogger } from "@/infrastructure/logger";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createInviteUserUseCase } from "./invite-user";

const logger = createLogger("test");

const auth0Config = {
  domain: "test.auth0.com",
  clientId: "test-client-id",
  managementClientId: "test-management-client-id",
  managementClientSecret: "test-management-client-secret",
  connectionId: "test-connection-id",
  primaryOrganizationId: "org_1234567890",
};

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
    `https://test.auth0.com/api/v2/organizations/${auth0Config.primaryOrganizationId}/invitations`,
    () => {
      return new HttpResponse(null, { status: 201 });
    },
  ),
);

describe("inviteUser", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should successfully invite a user", async () => {
    const inviteUser = createInviteUserUseCase(logger, auth0Config);
    const result = await inviteUser({
      organizationId: "test-org-id",
      email: "test@example.com",
    });

    expect(result).toEqual({ success: true });
  });

  it("should handle token request failure", async () => {
    server.use(
      http.post("https://test.auth0.com/oauth/token", () => {
        return new HttpResponse(null, { status: 401 });
      }),
    );

    const inviteUser = createInviteUserUseCase(logger, auth0Config);
    const result = await inviteUser({
      organizationId: "test-org-id",
      email: "test@example.com",
    });

    expect(result).toEqual({
      success: false,
      error: "Failed to authenticate with Auth0",
    });
  });

  it("should handle invitation request failure", async () => {
    server.use(
      http.post(
        `https://test.auth0.com/api/v2/organizations/${auth0Config.primaryOrganizationId}/invitations`,
        () => {
          return new HttpResponse(null, { status: 400 });
        },
      ),
    );

    const inviteUser = createInviteUserUseCase(logger, auth0Config);
    const result = await inviteUser({
      organizationId: "test-org-id",
      email: "test@example.com",
    });

    expect(result).toEqual({
      success: false,
      error: "Failed to invite user",
    });
  });
});
