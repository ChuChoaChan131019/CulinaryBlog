import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { RecipeStatus } from '@culinary/shared';
import { GetRecipesQueryParams } from '../dto/get-recipes-query.dto';

export class GetRecipesQuery {
  constructor(
    public readonly params: GetRecipesQueryParams,
    public readonly user?: AuthenticatedUser,
    public readonly ownerStatuses: RecipeStatus[] = ['Draft', 'Archived'],
  ) {}
}
