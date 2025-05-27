import type { Logger } from "@/infrastructure/logger";
import type { User } from "@/modules/user/domain/user.entity";
import { userSchema } from "@/modules/user/domain/user.entity";
import type { UserRepository } from "../infrastructure/user.repository";

export type UserUseCases = ReturnType<typeof userUseCases>;
export const userUseCases = (
  userRepository: UserRepository,
  logger: Logger,
) => ({
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
});

/**
 * Exposing the GetUserById type to the outside the module.
 */
export type GetUserById = UserUseCases["getUserById"];
