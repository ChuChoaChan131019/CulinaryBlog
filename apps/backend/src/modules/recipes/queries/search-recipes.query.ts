import { SearchRecipesQueryParams } from '../dto/search-recipes-query.dto';

export class SearchRecipesQuery {
  constructor(public readonly params: SearchRecipesQueryParams) {}
}
