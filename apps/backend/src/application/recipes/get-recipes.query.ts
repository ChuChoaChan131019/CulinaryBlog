import { RecipeListCriteria } from './recipe.repository';

export class GetRecipesQuery {
  constructor(
    public readonly params: Omit<RecipeListCriteria, 'viewer'>,
    public readonly user?: { id: string; role: 'Author' | 'Admin'; email?: string },
  ) {}
}
