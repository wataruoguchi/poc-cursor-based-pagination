import { z } from "zod";

/**
 * This is the schema for the user entity. It is not identical to the database schema by design. It does not include password_hash.
 * The database schema is used for persistence, while the domain schema is used for validation and business logic.
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  status: z.enum(["active", "inactive"]),
  createdAt: z.date(),
});

export type User = z.infer<typeof userSchema>;
