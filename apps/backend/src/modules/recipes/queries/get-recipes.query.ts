import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { GetRecipesQueryParams } from '../dto/get-recipes-query.dto';

export class GetRecipesQuery {
  constructor(
    public readonly params: GetRecipesQueryParams,
    public readonly user?: AuthenticatedUser,
  ) {}
}
