import { AuthenticatedUser } from '../../../common/auth/authenticated-user';

export class DeleteRecipeCommand {
  constructor(
    public readonly recipeId: string,
    public readonly user: AuthenticatedUser,
  ) {}
}
