import { z } from "zod";

const envSchema = z.object({
  AUTH0_DOMAIN: z.string(),
  AUTH0_CLIENT_MANAGEMENT_ID: z.string(),
  AUTH0_CLIENT_MANAGEMENT_SECRET: z.string(),
  AUTH0_CLIENT_ID: z.string(),
  AUTH0_CONNECTION_ID: z.string(),
  PGHOST: z.string(),
  PGPORT: z.coerce.number(),
  PGDATABASE: z.string(),
  PGUSER: z.string(),
  PGPASSWORD: z.string(),
  PRIMARY_ORGANIZATION_ID: z.string(), // This project is PoC but we don't want to hardcode the primary organization id.
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
