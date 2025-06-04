import { z } from "zod";

export const inviteUserSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export type InviteUserResult = {
  success: boolean;
  error?: string;
};
