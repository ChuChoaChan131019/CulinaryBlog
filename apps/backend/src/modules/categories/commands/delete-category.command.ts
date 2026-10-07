import { AuthenticatedUser } from '../../../common/auth/authenticated-user';

export class DeleteCategoryCommand {
  constructor(
    public readonly categoryId: string,
    public readonly user: AuthenticatedUser,
  ) {}
}
