import { UserRole } from '../../domain/users/user';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  emailExists(email: string): Promise<boolean>;
  createAuthor(email: string, passwordHash: string, displayName: string): Promise<{
    id: string; email: string; displayName: string;
  }>;
  findActiveById(id: string): Promise<{ id: string; email: string; role: UserRole } | null>;
}
