import type { Logger } from "../../../infrastructure/logger";
import type { User } from "../domain/entity";
import type { UserRepository } from "../domain/repository.type";

export const createGetAllUsersUseCase = (
  userRepository: UserRepository,
  logger: Logger,
) => ({
  execute: async (): Promise<User[]> => {
    logger.info("Usecase: Getting all users");
    return userRepository.findAll();
  },
});
