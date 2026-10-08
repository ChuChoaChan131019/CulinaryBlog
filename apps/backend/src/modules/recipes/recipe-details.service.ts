import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DATABASE_CONNECTION, Database } from '../../infrastructure/database/database.module';
import { categories, recipeImages, recipeIngredients, recipes, recipeSteps, users } from '../../infrastructure/database/schema';
import { RecipeDto } from './dto/recipe.dto';

@Injectable()
export class RecipeDetailsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async getBySlug(slug: string, user?: AuthenticatedUser): Promise<RecipeDto> {
    const [recipe] = await this.db.select({ recipe: recipes, categoryName: categories.name, categorySlug: categories.slug, authorDisplayName: users.displayName, authorAvatarUrl: users.avatarUrl })
      .from(recipes).innerJoin(categories, eq(recipes.categoryId, categories.id)).innerJoin(users, eq(recipes.authorId, users.id))
      .where(and(eq(recipes.slug, slug), eq(recipes.isDeleted, false))).limit(1);
    if (!recipe) throw new NotFoundException({ type: 'RECIPE_NOT_FOUND', status: 404 });
    const visible = recipe.recipe.status === 'Published' || user?.role === 'Admin' || user?.id === recipe.recipe.authorId;
    if (!visible) throw new ForbiddenException({ type: 'RECIPE_FORBIDDEN', status: 403 });

    const [steps, ingredients, images] = await Promise.all([
      this.db.select().from(recipeSteps).where(and(eq(recipeSteps.recipeId, recipe.recipe.id), eq(recipeSteps.isDeleted, false))).orderBy(asc(recipeSteps.stepNumber)),
      this.db.select().from(recipeIngredients).where(and(eq(recipeIngredients.recipeId, recipe.recipe.id), eq(recipeIngredients.isDeleted, false))).orderBy(asc(recipeIngredients.orderIndex), asc(recipeIngredients.createdAt)),
      this.db.select().from(recipeImages).where(and(eq(recipeImages.recipeId, recipe.recipe.id), eq(recipeImages.isDeleted, false))).orderBy(desc(recipeImages.isPrimary), asc(recipeImages.orderIndex), asc(recipeImages.createdAt)),
    ]);
    return {
      id: recipe.recipe.id, title: recipe.recipe.title, slug: recipe.recipe.slug, description: recipe.recipe.description,
      instructions: recipe.recipe.instructions, prepTime: recipe.recipe.prepTime, cookTime: recipe.recipe.cookTime,
      servings: recipe.recipe.servings, difficulty: recipe.recipe.difficulty, status: recipe.recipe.status,
      categoryId: recipe.recipe.categoryId, authorId: recipe.recipe.authorId,
      nutrition: { calories: recipe.recipe.nutritionCalories, protein: recipe.recipe.nutritionProtein, carbohydrates: recipe.recipe.nutritionCarbohydrates, fat: recipe.recipe.nutritionFat, fiber: recipe.recipe.nutritionFiber, sodium: recipe.recipe.nutritionSodium },
      steps: steps.map((row) => ({ id: row.id, stepNumber: row.stepNumber, title: row.title, description: row.description, timerMinutes: row.timerMinutes, imageUrl: row.imageUrl })),
      ingredients: ingredients.map((row) => ({ id: row.id, name: row.name, quantity: row.quantity, unit: row.unit, notes: row.notes, orderIndex: row.orderIndex })),
      images: images.map((row) => ({ imageId: row.id, originalUrl: row.originalUrl, altText: row.altText, isPrimary: row.isPrimary })),
      rowVersion: recipe.recipe.rowVersion, createdAt: recipe.recipe.createdAt, updatedAt: recipe.recipe.updatedAt,
      category: { name: recipe.categoryName, slug: recipe.categorySlug },
      author: { displayName: recipe.authorDisplayName, avatarUrl: recipe.authorAvatarUrl },
    } as RecipeDto;
  }
}
