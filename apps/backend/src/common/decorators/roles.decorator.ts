import { SetMetadata } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AuthenticatedUser['role'][]) =>
  SetMetadata(ROLES_KEY, roles);
