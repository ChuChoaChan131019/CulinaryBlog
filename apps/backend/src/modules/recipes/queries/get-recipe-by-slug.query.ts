import { AuthenticatedUser } from '../../../common/auth/authenticated-user';

export class GetRecipeBySlugQuery {
  constructor(
    public readonly slug: string,
    public readonly user?: AuthenticatedUser,
  ) {}
}
