import type { Logger } from "@/infrastructure/logger";
import type { User } from "@/modules/user/domain/entity";
import type { UserRepository } from "@/modules/user/domain/repository.type";

export type UserUseCases = ReturnType<typeof userUseCases>;
export const userUseCases = (
  userRepository: UserRepository,
  logger: Logger,
) => ({
  getAllUsers: async (): Promise<User[]> => {
    logger.info("Usecase: Getting all users");
    return userRepository.findAll();
  },
  getUserById: async (id: string): Promise<User | null> => {
    logger.info("Usecase: Getting user by id", { id });
    return userRepository.findById(id);
  },
});

/**
 * Exposing the GetUserById type to the outside the module.
 */
export type GetUserById = UserUseCases["getUserById"];
