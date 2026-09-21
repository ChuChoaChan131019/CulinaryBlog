import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PagedResult, RecipeSummaryDto } from '@culinary/shared';
import { CACHE_PORT, CachePort } from '../ports/cache.port';
import { GetRecipesQuery } from './get-recipes.query';
import { RECIPE_REPOSITORY, RecipeRepository } from './recipe.repository';

const CACHE_TTL_SECONDS = 15 * 60;

@QueryHandler(GetRecipesQuery)
export class GetRecipesHandler implements IQueryHandler<GetRecipesQuery, PagedResult<RecipeSummaryDto>> {
  constructor(
    @Inject(RECIPE_REPOSITORY) private readonly recipes: RecipeRepository,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
  ) {}

  async execute(query: GetRecipesQuery): Promise<PagedResult<RecipeSummaryDto>> {
    const cacheKey = this.createCacheKey(query);
    const cached = await this.cache.get<PagedResult<RecipeSummaryDto>>(cacheKey, CACHE_TTL_SECONDS);
    if (cached !== null) return cached;

    const result = await this.recipes.list({ ...query.params, viewer: query.user });
    await this.cache.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  private createCacheKey(query: GetRecipesQuery): string {
    const { params, user } = query;
    const visibility = user?.role === 'Admin' ? 'Admin' : user ? `Author:${user.id}` : 'Guest';
    return [
      'recipes:list', visibility, params.page, params.pageSize,
      params.categoryId ?? '-', params.difficulty ?? '-',
      params.maxCookTime ?? '-', params.sort,
    ].join(':');
  }
}
