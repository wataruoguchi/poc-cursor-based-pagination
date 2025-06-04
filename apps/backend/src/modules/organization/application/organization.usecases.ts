import type { Logger } from "@/infrastructure/logger";
import type { Organization } from "../domain/organization.entity";
import { organizationSchema } from "../domain/organization.entity";
import type { OrganizationRepository } from "../infrastructure/organization.repository";

export type OrganizationUseCases = ReturnType<typeof organizationUseCases>;
export const organizationUseCases = (
  organizationRepository: OrganizationRepository,
  logger: Logger,
) => {
  return {
    getAllOrganizations: async (): Promise<Organization[]> => {
      logger.info("Usecase: Getting all organizations");
      const organizations = await organizationRepository.findAll();
      return organizations.map((org) =>
        organizationSchema.parse({
          ...org,
        }),
      );
    },
  };
};
