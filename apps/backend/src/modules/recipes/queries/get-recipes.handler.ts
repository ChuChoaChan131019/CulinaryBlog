import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PagedResult, RecipeSummaryDto } from '@culinary/shared';
import {
  SQL,
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../../infrastructure/database/database.module';
import {
  categories,
  recipes,
  users,
} from '../../../infrastructure/database/schema';
import { RecipeSort } from '../dto/get-recipes-query.dto';
import { GetRecipesQuery } from './get-recipes.query';

const CACHE_TTL_SECONDS = 15 * 60;

@QueryHandler(GetRecipesQuery)
export class GetRecipesHandler
  implements IQueryHandler<GetRecipesQuery, PagedResult<RecipeSummaryDto>>
{
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async execute(
    query: GetRecipesQuery,
  ): Promise<PagedResult<RecipeSummaryDto>> {
    const { params } = query;
    const cacheKey = this.createCacheKey(query);
    const cached = await this.cache.get<PagedResult<RecipeSummaryDto>>(
      cacheKey,
      CACHE_TTL_SECONDS,
    );
    if (cached !== null) return cached;

    const where = and(...this.createConditions(query));
    const [{ totalCount }] = await this.db
      .select({ totalCount: count() })
      .from(recipes)
      .where(where);

    const rows = await this.db
      .select({
        id: recipes.id,
        title: recipes.title,
        slug: recipes.slug,
        excerpt: recipes.description,
        coverImageUrl: sql<string | null>`null`,
        status: recipes.status,
        difficulty: recipes.difficulty,
        prepTimeMinutes: recipes.prepTime,
        cookTimeMinutes: recipes.cookTime,
        servings: recipes.servings,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
        publishedAt: recipes.publishedAt,
        createdAt: recipes.createdAt,
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.authorId, users.id))
      .innerJoin(categories, eq(recipes.categoryId, categories.id))
      .where(where)
      .orderBy(this.createOrder(params.sort), asc(recipes.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    const items: RecipeSummaryDto[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      coverImageUrl: row.coverImageUrl,
      status: row.status,
      difficulty: row.difficulty,
      prepTimeMinutes: row.prepTimeMinutes,
      cookTimeMinutes: row.cookTimeMinutes,
      servings: row.servings,
      author: {
        id: row.authorId,
        displayName: row.authorDisplayName,
        avatarUrl: row.authorAvatarUrl,
      },
      category: {
        id: row.categoryId,
        name: row.categoryName,
        slug: row.categorySlug,
      },
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
    const totalPages = Math.ceil(totalCount / params.pageSize);
    const result: PagedResult<RecipeSummaryDto> = {
      items,
      totalCount,
      page: params.page,
      pageSize: params.pageSize,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  private createConditions(query: GetRecipesQuery): SQL[] {
    const { params, user } = query;
    const conditions: SQL[] = [eq(recipes.isDeleted, false)];

    if (user?.role !== 'Admin') {
      conditions.push(
        user
          ? or(
              eq(recipes.status, 'Published'),
              and(
                eq(recipes.authorId, user.id),
                inArray(recipes.status, ['Draft', 'Archived']),
              ),
            )!
          : eq(recipes.status, 'Published'),
      );
    }
    if (params.categoryId) {
      conditions.push(eq(recipes.categoryId, params.categoryId));
    }
    if (params.difficulty) {
      conditions.push(eq(recipes.difficulty, params.difficulty));
    }
    if (params.maxCookTime !== undefined) {
      conditions.push(lte(recipes.cookTime, params.maxCookTime));
    }

    return conditions;
  }

  private createOrder(sort: RecipeSort): SQL {
    const descending = sort.startsWith('-');
    const field = descending ? sort.slice(1) : sort;
    const column =
      field === 'title'
        ? recipes.title
        : field === 'cookTime'
          ? recipes.cookTime
          : recipes.createdAt;

    return descending ? desc(column) : asc(column);
  }

  private createCacheKey(query: GetRecipesQuery): string {
    const { params, user } = query;
    const visibility =
      user?.role === 'Admin'
        ? 'Admin'
        : user
          ? `Author:${user.id}`
          : 'Guest';

    return [
      'recipes:list',
      visibility,
      params.page,
      params.pageSize,
      params.categoryId ?? '-',
      params.difficulty ?? '-',
      params.maxCookTime ?? '-',
      params.sort,
    ].join(':');
  }
}
