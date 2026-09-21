import { Inject, Injectable } from '@nestjs/common';
import { PagedResult, RecipeSummaryDto } from '@culinary/shared';
import {
  SQL, and, asc, count, desc, eq, inArray, lte, or, sql,
} from 'drizzle-orm';
import {
  RecipeCreated,
  RecipeListCriteria,
  RecipeRepository,
  RecipeSort,
} from '../../../application/recipes/recipe.repository';
import { RecipeDraft } from '../../../domain/recipes/recipe';
import { DATABASE_CONNECTION, Database } from '../database.module';
import { categories, recipeIngredients, recipes, recipeSteps, users } from '../schema';

@Injectable()
export class DrizzleRecipeRepository implements RecipeRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async categoryExists(categoryId: string): Promise<boolean> {
    const [category] = await this.db.select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.isDeleted, false)))
      .limit(1);
    return !!category;
  }

  async slugExists(slug: string): Promise<boolean> {
    const [recipe] = await this.db.select({ id: recipes.id })
      .from(recipes).where(eq(recipes.slug, slug)).limit(1);
    return !!recipe;
  }

  createDraft(draft: RecipeDraft): Promise<RecipeCreated> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(recipes).values({
        title: draft.title,
        slug: draft.slug,
        description: draft.description,
        instructions: draft.instructions,
        prepTime: draft.prepTime,
        cookTime: draft.cookTime,
        servings: draft.servings,
        difficulty: draft.difficulty,
        categoryId: draft.categoryId,
        authorId: draft.authorId,
        status: 'Draft',
        nutritionCalories: this.toDecimal(draft.nutrition?.calories),
        nutritionProtein: this.toDecimal(draft.nutrition?.protein),
        nutritionCarbohydrates: this.toDecimal(draft.nutrition?.carbohydrates),
        nutritionFat: this.toDecimal(draft.nutrition?.fat),
        nutritionFiber: this.toDecimal(draft.nutrition?.fiber),
        nutritionSodium: this.toDecimal(draft.nutrition?.sodium),
      }).returning();

      const steps = draft.steps?.length
        ? await tx.insert(recipeSteps).values(draft.steps.map((step) => ({
            ...step,
            recipeId: created.id,
          }))).returning({
            id: recipeSteps.id,
            stepNumber: recipeSteps.stepNumber,
            title: recipeSteps.title,
            description: recipeSteps.description,
            timerMinutes: recipeSteps.timerMinutes,
            imageUrl: recipeSteps.imageUrl,
          })
        : [];
      const ingredients = draft.ingredients?.length
        ? await tx.insert(recipeIngredients).values(draft.ingredients.map((ingredient, index) => ({
            ...ingredient,
            recipeId: created.id,
            quantity: this.toDecimal(ingredient.quantity),
            orderIndex: ingredient.orderIndex ?? index,
          }))).returning({
            id: recipeIngredients.id,
            name: recipeIngredients.name,
            quantity: recipeIngredients.quantity,
            unit: recipeIngredients.unit,
            notes: recipeIngredients.notes,
            orderIndex: recipeIngredients.orderIndex,
          })
        : [];

      return {
        id: created.id,
        title: created.title,
        slug: created.slug,
        description: created.description,
        instructions: created.instructions,
        prepTime: created.prepTime,
        cookTime: created.cookTime,
        servings: created.servings,
        difficulty: created.difficulty,
        status: 'Draft' as const,
        categoryId: created.categoryId,
        authorId: created.authorId,
        nutrition: {
          calories: created.nutritionCalories,
          protein: created.nutritionProtein,
          carbohydrates: created.nutritionCarbohydrates,
          fat: created.nutritionFat,
          fiber: created.nutritionFiber,
          sodium: created.nutritionSodium,
        },
        steps,
        ingredients,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    });
  }

  async list(criteria: RecipeListCriteria): Promise<PagedResult<RecipeSummaryDto>> {
    const where = and(...this.createConditions(criteria));
    const [{ totalCount }] = await this.db.select({ totalCount: count() })
      .from(recipes).where(where);

    const rows = await this.db.select({
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
    }).from(recipes)
      .innerJoin(users, eq(recipes.authorId, users.id))
      .innerJoin(categories, eq(recipes.categoryId, categories.id))
      .where(where)
      .orderBy(this.createOrder(criteria.sort), asc(recipes.id))
      .limit(criteria.pageSize)
      .offset((criteria.page - 1) * criteria.pageSize);

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
    const totalPages = Math.ceil(totalCount / criteria.pageSize);
    return {
      items,
      totalCount,
      page: criteria.page,
      pageSize: criteria.pageSize,
      totalPages,
      hasNextPage: criteria.page < totalPages,
      hasPreviousPage: criteria.page > 1,
    };
  }

  private createConditions(criteria: RecipeListCriteria): SQL[] {
    const { viewer } = criteria;
    const conditions: SQL[] = [eq(recipes.isDeleted, false)];
    if (viewer?.role !== 'Admin') {
      conditions.push(viewer
        ? or(
            eq(recipes.status, 'Published'),
            and(eq(recipes.authorId, viewer.id), inArray(recipes.status, ['Draft', 'Archived'])),
          )!
        : eq(recipes.status, 'Published'));
    }
    if (criteria.categoryId) conditions.push(eq(recipes.categoryId, criteria.categoryId));
    if (criteria.difficulty) conditions.push(eq(recipes.difficulty, criteria.difficulty));
    if (criteria.maxCookTime !== undefined) conditions.push(lte(recipes.cookTime, criteria.maxCookTime));
    return conditions;
  }

  private createOrder(sort: RecipeSort): SQL {
    const descending = sort.startsWith('-');
    const field = descending ? sort.slice(1) : sort;
    const column = field === 'title' ? recipes.title : field === 'cookTime' ? recipes.cookTime : recipes.createdAt;
    return descending ? desc(column) : asc(column);
  }

  private toDecimal(value: number | undefined): string | null {
    return value === undefined ? null : value.toString();
  }
}
