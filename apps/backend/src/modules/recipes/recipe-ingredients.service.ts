import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../infrastructure/database/database.module';
import {
  recipeIngredients,
  recipes,
} from '../../infrastructure/database/schema';
import {
  CreateRecipeIngredientDto,
  UpdateRecipeIngredientDto,
} from './dto/recipe-ingredient.dto';
import { RecipeIngredientResponseDto } from './dto/recipe.dto';

@Injectable()
export class RecipeIngredientsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async create(
    recipeId: string,
    dto: CreateRecipeIngredientDto,
    user: AuthenticatedUser,
  ): Promise<RecipeIngredientResponseDto> {
    await this.getOwnedRecipe(recipeId, user);
    const [ingredient] = await this.db
      .insert(recipeIngredients)
      .values({
        recipeId,
        name: dto.name.trim(),
        quantity: this.toDecimal(dto.quantity),
        unit: dto.unit.trim(),
        notes: dto.notes?.trim() || null,
        orderIndex: dto.orderIndex ?? 0,
      })
      .returning();

    if (!ingredient) throw new Error('Recipe ingredient insert returned no row.');
    await this.cache.delete('recipes');
    return this.toResponse(ingredient);
  }

  async update(
    recipeId: string,
    ingredientId: string,
    dto: UpdateRecipeIngredientDto,
    user: AuthenticatedUser,
  ): Promise<RecipeIngredientResponseDto> {
    await this.getOwnedRecipe(recipeId, user);
    const [ingredient] = await this.db
      .update(recipeIngredients)
      .set({
        name: dto.name.trim(),
        quantity: this.toDecimal(dto.quantity),
        unit: dto.unit.trim(),
        notes: dto.notes?.trim() || null,
        orderIndex: dto.orderIndex ?? 0,
        updatedAt: new Date(),
        rowVersion: sql`${recipeIngredients.rowVersion} + 1`,
      })
      .where(
        and(
          eq(recipeIngredients.id, ingredientId),
          eq(recipeIngredients.recipeId, recipeId),
          eq(recipeIngredients.isDeleted, false),
        ),
      )
      .returning();

    if (!ingredient) throw this.ingredientNotFound();
    await this.cache.delete('recipes');
    return this.toResponse(ingredient);
  }

  async remove(
    recipeId: string,
    ingredientId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.getOwnedRecipe(recipeId, user);
    const [ingredient] = await this.db
      .update(recipeIngredients)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
        rowVersion: sql`${recipeIngredients.rowVersion} + 1`,
      })
      .where(
        and(
          eq(recipeIngredients.id, ingredientId),
          eq(recipeIngredients.recipeId, recipeId),
          eq(recipeIngredients.isDeleted, false),
        ),
      )
      .returning({ id: recipeIngredients.id });

    if (!ingredient) throw this.ingredientNotFound();
    await this.cache.delete('recipes');
  }

  async list(
    recipeId: string,
    user: AuthenticatedUser,
  ): Promise<RecipeIngredientResponseDto[]> {
    await this.getOwnedRecipe(recipeId, user);
    const ingredients = await this.db
      .select()
      .from(recipeIngredients)
      .where(
        and(
          eq(recipeIngredients.recipeId, recipeId),
          eq(recipeIngredients.isDeleted, false),
        ),
      )
      .orderBy(asc(recipeIngredients.orderIndex), asc(recipeIngredients.createdAt));
    return ingredients.map((ingredient) => this.toResponse(ingredient));
  }

  private async getOwnedRecipe(recipeId: string, user: AuthenticatedUser) {
    const [recipe] = await this.db
      .select({ id: recipes.id, authorId: recipes.authorId })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.isDeleted, false)))
      .limit(1);
    if (!recipe) throw new NotFoundException({ type: 'RECIPE_NOT_FOUND', status: 404 });
    if (user.role !== 'Admin' && recipe.authorId !== user.id) {
      throw new ForbiddenException({ type: 'RECIPE_FORBIDDEN', status: 403 });
    }
    return recipe;
  }

  private ingredientNotFound(): NotFoundException {
    return new NotFoundException({ type: 'RECIPE_INGREDIENT_NOT_FOUND', status: 404 });
  }

  private toDecimal(value: number): string {
    return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }

  private toResponse(
    ingredient: typeof recipeIngredients.$inferSelect,
  ): RecipeIngredientResponseDto {
    return {
      id: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      notes: ingredient.notes,
      orderIndex: ingredient.orderIndex,
    };
  }
}
