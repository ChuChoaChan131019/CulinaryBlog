import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CategorySummary } from '../../domain/categories/category';
import { CACHE_PORT, CachePort } from '../ports/cache.port';
import { CATEGORY_REPOSITORY, CategoryRepository } from './category.repository';
import { GetCategoriesQuery } from './get-categories.query';

const CACHE_KEY = 'categories:all';
const CACHE_TTL_SECONDS = 60 * 60;

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery, CategorySummary[]> {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
  ) {}

  async execute(_query: GetCategoriesQuery): Promise<CategorySummary[]> {
    const cached = await this.cache.get<CategorySummary[]>(CACHE_KEY, CACHE_TTL_SECONDS);
    if (cached !== null) return cached;

    const result = await this.categories.listActiveWithRecipeCount();
    await this.cache.set(CACHE_KEY, result, CACHE_TTL_SECONDS);
    return result;
  }
}
