import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { and, asc, eq, sql } from 'drizzle-orm';
import { CategoryDto } from '@culinary/shared';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import { categories, recipes } from '../../../infrastructure/database/schema';
import { GetCategoriesQuery } from './get-categories.query';

const CACHE_KEY = 'categories:all';
const CACHE_TTL_SECONDS = 60 * 60;

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery, CategoryDto[]> {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async execute(query: GetCategoriesQuery): Promise<CategoryDto[]> {
    void query;
    const cached = await this.cache.get<CategoryDto[]>(CACHE_KEY, CACHE_TTL_SECONDS);
    if (cached !== null) return cached;

    const result = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: categories.imageUrl,
        recipeCount: sql<number>`count(${recipes.id})::int`,
      })
      .from(categories)
      .leftJoin(
        recipes,
        and(
          eq(recipes.categoryId, categories.id),
          eq(recipes.status, 'Published'),
          eq(recipes.isDeleted, false),
        ),
      )
      .where(eq(categories.isDeleted, false))
      .groupBy(
        categories.id,
        categories.name,
        categories.slug,
        categories.description,
        categories.imageUrl,
      )
      .orderBy(asc(categories.name));

    await this.cache.set(CACHE_KEY, result, CACHE_TTL_SECONDS);
    return result;
  }
}
