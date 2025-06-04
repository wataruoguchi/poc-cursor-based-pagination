import type { Logger } from "@/infrastructure/logger";
import { Hono } from "hono";
import type { Organization } from "../domain/organization.entity";

type OrganizationControllerDeps = {
  getAllOrganizations: () => Promise<Organization[]>;
};

export const createOrganizationController = (
  deps: OrganizationControllerDeps,
  logger: Logger,
) => {
  const controller = new Hono();

  controller.get("/", async (c) => {
    const organizations = await deps.getAllOrganizations();
    logger.info(`Found ${organizations.length} organizations`);
    return c.json(organizations);
  });

  return controller;
};
