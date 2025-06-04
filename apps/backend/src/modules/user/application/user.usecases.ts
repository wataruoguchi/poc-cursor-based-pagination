import type { Logger } from "@/infrastructure/logger";
import type { User } from "@/modules/user/domain/user.entity";
import { userSchema } from "@/modules/user/domain/user.entity";
import { env } from "@/shared/utils/env";
import type { UserRepository } from "../infrastructure/user.repository";
import { createInviteUserUseCase } from "./invite-user";

export type UserUseCases = ReturnType<typeof userUseCases>;
export const userUseCases = (
  userRepository: UserRepository,
  logger: Logger,
) => {
  const inviteUser = createInviteUserUseCase(logger, {
    domain: env.AUTH0_DOMAIN,
    managementClientId: env.AUTH0_CLIENT_MANAGEMENT_ID,
    managementClientSecret: env.AUTH0_CLIENT_MANAGEMENT_SECRET,
    clientId: env.AUTH0_CLIENT_ID,
    connectionId: env.AUTH0_CONNECTION_ID,
    primaryOrganizationId: env.PRIMARY_ORGANIZATION_ID,
  });

  return {
    getAllUsers: async (): Promise<User[]> => {
      logger.info("Usecase: Getting all users");
      const users = await userRepository.findAll();
      return users.map((user) =>
        userSchema.parse({
          ...user,
          createdAt: user.created_at,
        }),
      );
    },
    getUserById: async (id: string): Promise<User | null> => {
      logger.info({ id }, "Usecase: Getting user by id");
      const user = await userRepository.findById(id);
      return user
        ? userSchema.parse({
            ...user,
            createdAt: user.created_at,
          })
        : null;
    },
    inviteUser,
  };
};

/**
 * Exposing the GetUserById type to the outside the module.
 */
export type GetUserById = UserUseCases["getUserById"];
