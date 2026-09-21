import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { CategoryRepository } from '../../../application/categories/category.repository';
import { CategorySummary } from '../../../domain/categories/category';
import { DATABASE_CONNECTION, Database } from '../database.module';
import { categories, recipes } from '../schema';

@Injectable()
export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  listActiveWithRecipeCount(): Promise<CategorySummary[]> {
    return this.db
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
  }
}
