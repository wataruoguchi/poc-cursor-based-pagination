import type { Logger } from "@/infrastructure/logger";
import type { InviteUserInput, InviteUserResult } from "../domain/invite-user";

type Auth0Config = {
  domain: string;
  managementClientId: string;
  managementClientSecret: string;
  clientId: string;
  connectionId: string;
  primaryOrganizationId: string;
};

export const createInviteUserUseCase = (
  logger: Logger,
  auth0Config: Auth0Config,
) => {
  return async (input: InviteUserInput): Promise<InviteUserResult> => {
    try {
      // Get Auth0 Management API token
      const tokenResponse = await fetch(
        `https://${auth0Config.domain}/oauth/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: auth0Config.managementClientId,
            client_secret: auth0Config.managementClientSecret,
            audience: `https://${auth0Config.domain}/api/v2/`,
            grant_type: "client_credentials",
          }),
        },
      );

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        logger.error({ error }, "Failed to get Auth0 management token");
        return { success: false, error: "Failed to authenticate with Auth0" };
      }

      const { access_token } = await tokenResponse.json();

      // This is a PoC, we don't want to hardcode the primary organization id.
      const organizationId =
        input.organizationId === auth0Config.primaryOrganizationId
          ? input.organizationId
          : auth0Config.primaryOrganizationId;

      // Create user invitation
      const inviteResponse = await fetch(
        `https://${auth0Config.domain}/api/v2/organizations/${organizationId}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            client_id: auth0Config.clientId,
            invitee: { email: input.email },
            inviter: {
              name: "System",
            },
            connection_id: auth0Config.connectionId,
            ttl_sec: 60 * 60 * 24 * 30, // 30 days
          }),
        },
      );

      // TODO: It requires the application to have "Application Login URI", however, it does not take localhost.
      if (!inviteResponse.ok) {
        const error = await inviteResponse.text();
        logger.error({ error }, "Failed to invite user");
        return { success: false, error: "Failed to invite user" };
      }

      return { success: true };
    } catch (error) {
      logger.error({ error }, "Error inviting user");
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };
};
