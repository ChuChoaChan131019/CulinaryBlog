import { AuthenticatedUser } from '../../../common/auth/authenticated-user';

export class PublishRecipeCommand {
  constructor(
    public readonly recipeId: string,
    public readonly user: AuthenticatedUser,
  ) {}
}
