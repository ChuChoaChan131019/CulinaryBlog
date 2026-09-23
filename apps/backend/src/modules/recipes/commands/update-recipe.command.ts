import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';

export class UpdateRecipeCommand {
  constructor(
    public readonly recipeId: string,
    public readonly user: AuthenticatedUser,
    public readonly expectedRowVersion: number,
    public readonly changes: UpdateRecipeDto,
  ) {}
}
