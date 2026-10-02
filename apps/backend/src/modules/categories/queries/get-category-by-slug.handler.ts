import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import {
  CategoryDetailDto,
  PagedResult,
  RecipeSummaryDto,
} from '@culinary/shared';
import { and, eq, sql } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../../infrastructure/database/database.module';
import { categories, recipes } from '../../../infrastructure/database/schema';
import { GetRecipesQuery } from '../../recipes/queries/get-recipes.query';
import { GetCategoryBySlugQuery } from './get-category-by-slug.query';

@QueryHandler(GetCategoryBySlugQuery)
export class GetCategoryBySlugHandler implements IQueryHandler<
  GetCategoryBySlugQuery,
  CategoryDetailDto
> {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetCategoryBySlugQuery): Promise<CategoryDetailDto> {
    const [category] = await this.db
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
      .where(
        and(eq(categories.slug, query.slug), eq(categories.isDeleted, false)),
      )
      .groupBy(
        categories.id,
        categories.name,
        categories.slug,
        categories.description,
        categories.imageUrl,
      );

    if (!category) {
      throw new NotFoundException({
        type: 'CATEGORY_NOT_FOUND',
        title: 'Danh mục không tồn tại',
        status: 404,
        detail: 'slug không trỏ tới danh mục hợp lệ',
      });
    }

    const recipesPage = await this.queryBus.execute<
      GetRecipesQuery,
      PagedResult<RecipeSummaryDto>
    >(
      new GetRecipesQuery(
        {
          page: query.params.page,
          pageSize: query.params.pageSize,
          categoryId: category.id,
          sort: '-createdAt',
        },
        query.user,
        ['Draft'],
      ),
    );

    return { category, recipes: recipesPage };
  }
}
