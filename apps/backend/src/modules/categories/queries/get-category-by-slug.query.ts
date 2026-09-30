import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { GetCategoryBySlugQueryParams } from '../dto/get-category-by-slug-query.dto';

export class GetCategoryBySlugQuery {
  constructor(
    public readonly slug: string,
    public readonly params: GetCategoryBySlugQueryParams,
    public readonly user?: AuthenticatedUser,
  ) {}
}
