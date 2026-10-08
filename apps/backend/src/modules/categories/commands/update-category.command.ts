import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import type { UpdateCategoryRequest } from '@culinary/shared';

export class UpdateCategoryCommand {
  constructor(
    public readonly categoryId: string,
    public readonly user: AuthenticatedUser,
    public readonly changes: UpdateCategoryRequest,
  ) {}
}
