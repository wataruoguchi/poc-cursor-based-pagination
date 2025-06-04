import type { Logger } from "@/infrastructure/logger";
import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import { z } from "zod";
import type { InviteUserInput } from "../domain/invite-user";

const inviteUserSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
});

export const createInviteUserRoute = (
  logger: Logger,
  inviteUser: (
    input: InviteUserInput,
  ) => Promise<{ success: boolean; error?: string }>,
) => {
  return createRoute({
    method: "post",
    path: "/",
    request: {
      body: {
        content: {
          "application/json": {
            schema: inviteUserSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "User invited successfully",
      },
      400: {
        description: "Invalid input",
      },
      500: {
        description: "Internal server error",
      },
    },
    handler: async (c: Context) => {
      const body = await c.req.json();

      try {
        const validatedInput = inviteUserSchema.parse(body);
        const result = await inviteUser(validatedInput);

        if (!result.success) {
          logger.error({ error: result.error }, "Failed to invite user");
          return c.json({ error: result.error }, 500);
        }

        return c.json({}, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json({ error: "Invalid input" }, 400);
        }
        throw error;
      }
    },
  });
};
