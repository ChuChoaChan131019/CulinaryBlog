import {
  ConflictException,
  Inject,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { and, eq } from 'drizzle-orm';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../../infrastructure/database/database.module';
import {
  categories,
  recipeIngredients,
  recipes,
  recipeSteps,
} from '../../../infrastructure/database/schema';
import { RecipeDto } from '../dto/recipe.dto';
import { CreateRecipeCommand } from './create-recipe.command';

@CommandHandler(CreateRecipeCommand)
export class CreateRecipeHandler implements ICommandHandler<
  CreateRecipeCommand,
  RecipeDto
> {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async execute(command: CreateRecipeCommand): Promise<RecipeDto> {
    const [category] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, command.categoryId),
          eq(categories.isDeleted, false),
        ),
      )
      .limit(1);

    if (!category) {
      throw new UnprocessableEntityException({
        type: 'CATEGORY_NOT_FOUND',
        title: 'Danh mục không tồn tại',
        status: 422,
        detail: 'categoryId không trỏ tới danh mục hợp lệ',
      });
    }

    const slug = await this.createUniqueSlug(command.title);

    try {
      const result = await this.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(recipes)
          .values({
            title: command.title,
            slug,
            description: command.description,
            instructions: command.instructions,
            prepTime: command.prepTime,
            cookTime: command.cookTime,
            servings: command.servings,
            difficulty: command.difficulty,
            categoryId: command.categoryId,
            authorId: command.authorId,
            status: 'Draft',
            nutritionCalories: this.toDecimal(command.nutrition?.calories),
            nutritionProtein: this.toDecimal(command.nutrition?.protein),
            nutritionCarbohydrates: this.toDecimal(
              command.nutrition?.carbohydrates,
            ),
            nutritionFat: this.toDecimal(command.nutrition?.fat),
            nutritionFiber: this.toDecimal(command.nutrition?.fiber),
            nutritionSodium: this.toDecimal(command.nutrition?.sodium),
          })
          .returning();

        const steps = command.steps?.length
          ? await tx
              .insert(recipeSteps)
              .values(
                command.steps.map((step) => ({
                  ...step,
                  recipeId: created.id,
                })),
              )
              .returning({
                id: recipeSteps.id,
                stepNumber: recipeSteps.stepNumber,
                title: recipeSteps.title,
                description: recipeSteps.description,
                timerMinutes: recipeSteps.timerMinutes,
                imageUrl: recipeSteps.imageUrl,
              })
          : [];

        const ingredients = command.ingredients?.length
          ? await tx
              .insert(recipeIngredients)
              .values(
                command.ingredients.map((ingredient, index) => ({
                  ...ingredient,
                  recipeId: created.id,
                  quantity: this.toDecimal(ingredient.quantity),
                  orderIndex: ingredient.orderIndex ?? index,
                })),
              )
              .returning({
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

      await this.cache.delete('recipes');
      return result;
    } catch (error: unknown) {
      if (this.isSlugUniqueViolation(error)) {
        throw new ConflictException({
          type: 'RECIPE_SLUG_EXISTS',
          title: 'Slug công thức đã tồn tại',
          status: 409,
          detail: 'Không thể tạo slug duy nhất cho công thức',
        });
      }
      throw error;
    }
  }

  private async createUniqueSlug(title: string): Promise<string> {
    const base = this.slugify(title) || 'cong-thuc';
    let suffix = 0;

    while (true) {
      const suffixText = suffix === 0 ? '' : `-${suffix}`;
      const candidate = `${base.slice(0, 220 - suffixText.length)}${suffixText}`;
      const [existing] = await this.db
        .select({ id: recipes.id })
        .from(recipes)
        .where(eq(recipes.slug, candidate))
        .limit(1);
      if (!existing) return candidate;
      suffix += 1;
    }
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toDecimal(value: number | undefined): string | null {
    return value === undefined ? null : value.toString();
  }

  private isSlugUniqueViolation(error: unknown): boolean {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== '23505'
    ) {
      return false;
    }

    return (
      !('constraint' in error) || String(error.constraint).includes('slug')
    );
  }
}
