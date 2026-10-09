import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RecipeDetailDto } from '@culinary/shared';
import { and, asc, desc, eq } from 'drizzle-orm';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../../infrastructure/database/database.module';
import {
  categories,
  recipeImages,
  recipeIngredients,
  recipes,
  recipeSteps,
  users,
} from '../../../infrastructure/database/schema';
import { GetRecipeBySlugQuery } from './get-recipe-by-slug.query';

const CACHE_TTL_SECONDS = 60 * 60;

@QueryHandler(GetRecipeBySlugQuery)
export class GetRecipeBySlugHandler implements IQueryHandler<
  GetRecipeBySlugQuery,
  RecipeDetailDto
> {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async execute(query: GetRecipeBySlugQuery): Promise<RecipeDetailDto> {
    const cacheKey = `recipes:detail:${query.slug}`;
    const cached = await this.cache.get<RecipeDetailDto>(
      cacheKey,
      CACHE_TTL_SECONDS,
    );
    if (cached) {
      this.assertVisible(cached.status, cached.author.id, query);
      return cached;
    }

    const [recipe] = await this.db
      .select({
        id: recipes.id,
        title: recipes.title,
        slug: recipes.slug,
        description: recipes.description,
        instructions: recipes.instructions,
        status: recipes.status,
        difficulty: recipes.difficulty,
        prepTimeMinutes: recipes.prepTime,
        cookTimeMinutes: recipes.cookTime,
        servings: recipes.servings,
        publishedAt: recipes.publishedAt,
        createdAt: recipes.createdAt,
        updatedAt: recipes.updatedAt,
        rowVersion: recipes.rowVersion,
        nutritionCalories: recipes.nutritionCalories,
        nutritionProtein: recipes.nutritionProtein,
        nutritionCarbohydrates: recipes.nutritionCarbohydrates,
        nutritionFat: recipes.nutritionFat,
        nutritionFiber: recipes.nutritionFiber,
        nutritionSodium: recipes.nutritionSodium,
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(recipes)
      .innerJoin(categories, eq(recipes.categoryId, categories.id))
      .innerJoin(users, eq(recipes.authorId, users.id))
      .where(and(eq(recipes.slug, query.slug), eq(recipes.isDeleted, false)))
      .limit(1);

    if (!recipe) {
      throw new NotFoundException({ type: 'RECIPE_NOT_FOUND', status: 404 });
    }
    this.assertVisible(recipe.status, recipe.authorId, query);

    const [steps, ingredients, images] = await Promise.all([
      this.db
        .select({
          id: recipeSteps.id,
          stepNumber: recipeSteps.stepNumber,
          title: recipeSteps.title,
          description: recipeSteps.description,
          timerMinutes: recipeSteps.timerMinutes,
          imageUrl: recipeSteps.imageUrl,
        })
        .from(recipeSteps)
        .where(
          and(
            eq(recipeSteps.recipeId, recipe.id),
            eq(recipeSteps.isDeleted, false),
          ),
        )
        .orderBy(asc(recipeSteps.stepNumber)),
      this.db
        .select({
          id: recipeIngredients.id,
          name: recipeIngredients.name,
          quantity: recipeIngredients.quantity,
          unit: recipeIngredients.unit,
          notes: recipeIngredients.notes,
          orderIndex: recipeIngredients.orderIndex,
        })
        .from(recipeIngredients)
        .where(
          and(
            eq(recipeIngredients.recipeId, recipe.id),
            eq(recipeIngredients.isDeleted, false),
          ),
        )
        .orderBy(
          asc(recipeIngredients.orderIndex),
          asc(recipeIngredients.createdAt),
        ),
      this.db
        .select({
          id: recipeImages.id,
          originalUrl: recipeImages.originalUrl,
          mediumUrl: recipeImages.mediumUrl,
          thumbnailUrl: recipeImages.thumbnailUrl,
          altText: recipeImages.altText,
          isPrimary: recipeImages.isPrimary,
          orderIndex: recipeImages.orderIndex,
        })
        .from(recipeImages)
        .where(
          and(
            eq(recipeImages.recipeId, recipe.id),
            eq(recipeImages.isDeleted, false),
          ),
        )
        .orderBy(
          desc(recipeImages.isPrimary),
          asc(recipeImages.orderIndex),
          asc(recipeImages.createdAt),
        ),
    ]);

    const result: RecipeDetailDto = {
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      excerpt: recipe.description,
      coverImageUrl:
        images.find((image) => image.isPrimary)?.mediumUrl ??
        images.find((image) => image.isPrimary)?.originalUrl ??
        null,
      status: recipe.status,
      difficulty: recipe.difficulty,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      servings: recipe.servings,
      author: {
        id: recipe.authorId,
        displayName: recipe.authorDisplayName,
        avatarUrl: recipe.authorAvatarUrl,
      },
      category: {
        id: recipe.categoryId,
        name: recipe.categoryName,
        slug: recipe.categorySlug,
      },
      publishedAt: recipe.publishedAt?.toISOString() ?? null,
      createdAt: recipe.createdAt.toISOString(),
      description: recipe.description,
      instructions: recipe.instructions,
      nutrition: {
        calories: recipe.nutritionCalories,
        protein: recipe.nutritionProtein,
        carbohydrates: recipe.nutritionCarbohydrates,
        fat: recipe.nutritionFat,
        fiber: recipe.nutritionFiber,
        sodium: recipe.nutritionSodium,
      },
      ingredients,
      steps,
      images,
      rowVersion: recipe.rowVersion,
      updatedAt: recipe.updatedAt?.toISOString() ?? null,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  private assertVisible(
    status: RecipeDetailDto['status'],
    authorId: string,
    query: GetRecipeBySlugQuery,
  ): void {
    if (
      status !== 'Published' &&
      query.user?.role !== 'Admin' &&
      query.user?.id !== authorId
    ) {
      throw new ForbiddenException({ type: 'RECIPE_FORBIDDEN', status: 403 });
    }
  }
}
