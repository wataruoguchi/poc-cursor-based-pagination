import { z } from "zod";

export const FetchedOrganizationsSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
export type FetchedOrganizations = z.infer<typeof FetchedOrganizationsSchema>;

export const getApiEndpointPath =
  "https://localhost:3000/api/organizations" as const;

export const queryKeyToOrganizations = ["organizations"];
