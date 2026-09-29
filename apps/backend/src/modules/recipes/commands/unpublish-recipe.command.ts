import { AuthenticatedUser } from '../../../common/auth/authenticated-user';

export class UnpublishRecipeCommand {
  constructor(
    public readonly recipeId: string,
    public readonly user: AuthenticatedUser,
  ) {}
}
