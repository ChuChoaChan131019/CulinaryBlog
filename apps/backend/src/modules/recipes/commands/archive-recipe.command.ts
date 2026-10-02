import { AuthenticatedUser } from '../../../common/auth/authenticated-user';

export class ArchiveRecipeCommand {
  constructor(
    public readonly recipeId: string,
    public readonly user: AuthenticatedUser,
  ) {}
}
