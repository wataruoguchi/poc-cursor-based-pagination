import type { User } from "./entity";

export type UserRepository = {
  findAll: () => Promise<User[]>;
  findById: (id: string) => Promise<User | null>;
};
