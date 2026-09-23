import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { and, asc, eq, sql } from 'drizzle-orm';
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
import { UpdateRecipeNutritionDto } from '../dto/update-recipe.dto';
import { UpdateRecipeCommand } from './update-recipe.command';

@CommandHandler(UpdateRecipeCommand)
export class UpdateRecipeHandler implements ICommandHandler<
  UpdateRecipeCommand,
  RecipeDto
> {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async execute(command: UpdateRecipeCommand): Promise<RecipeDto> {
    if (Object.values(command.changes).every((value) => value === undefined)) {
      throw new BadRequestException({
        type: 'VALIDATION_ERROR',
        title: 'Dữ liệu cập nhật không hợp lệ',
        status: 400,
        detail: 'Cần cung cấp ít nhất một trường để cập nhật',
      });
    }

    const result = await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: recipes.id,
          authorId: recipes.authorId,
        })
        .from(recipes)
        .where(
          and(eq(recipes.id, command.recipeId), eq(recipes.isDeleted, false)),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundException({
          type: 'RECIPE_NOT_FOUND',
          title: 'Không tìm thấy công thức',
          status: 404,
          detail: 'Công thức không tồn tại hoặc đã bị xóa',
        });
      }

      if (
        command.user.role !== 'Admin' &&
        existing.authorId !== command.user.id
      ) {
        throw new ForbiddenException({
          type: 'RECIPE_FORBIDDEN',
          title: 'Không có quyền cập nhật công thức',
          status: 403,
          detail: 'Bạn không phải tác giả của công thức này',
        });
      }

      if (command.changes.categoryId !== undefined) {
        const [category] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.id, command.changes.categoryId),
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
      }

      const changes = command.changes;
      const [updated] = await tx
        .update(recipes)
        .set({
          ...(changes.title !== undefined && { title: changes.title }),
          ...(changes.description !== undefined && {
            description: changes.description,
          }),
          ...(changes.categoryId !== undefined && {
            categoryId: changes.categoryId,
          }),
          ...(changes.prepTime !== undefined && {
            prepTime: changes.prepTime,
          }),
          ...(changes.cookTime !== undefined && {
            cookTime: changes.cookTime,
          }),
          ...(changes.servings !== undefined && {
            servings: changes.servings,
          }),
          ...(changes.difficulty !== undefined && {
            difficulty: changes.difficulty,
          }),
          ...(changes.instructions !== undefined && {
            instructions: changes.instructions,
          }),
          ...this.mapNutrition(changes.nutrition),
          updatedAt: new Date(),
          rowVersion: sql`${recipes.rowVersion} + 1`,
        })
        .where(
          and(
            eq(recipes.id, command.recipeId),
            eq(recipes.isDeleted, false),
            eq(recipes.rowVersion, command.expectedRowVersion),
          ),
        )
        .returning();

      if (!updated) {
        throw new ConflictException({
          type: 'RECIPE_CONCURRENCY_CONFLICT',
          title: 'Xung đột cập nhật công thức',
          status: 409,
          detail:
            'Công thức đã được cập nhật bởi yêu cầu khác; hãy tải lại dữ liệu',
        });
      }

      const [steps, ingredients] = await Promise.all([
        tx
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
              eq(recipeSteps.recipeId, updated.id),
              eq(recipeSteps.isDeleted, false),
            ),
          )
          .orderBy(asc(recipeSteps.stepNumber)),
        tx
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
              eq(recipeIngredients.recipeId, updated.id),
              eq(recipeIngredients.isDeleted, false),
            ),
          )
          .orderBy(asc(recipeIngredients.orderIndex)),
      ]);

      return {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        description: updated.description,
        instructions: updated.instructions,
        prepTime: updated.prepTime,
        cookTime: updated.cookTime,
        servings: updated.servings,
        difficulty: updated.difficulty,
        status: updated.status,
        categoryId: updated.categoryId,
        authorId: updated.authorId,
        nutrition: {
          calories: updated.nutritionCalories,
          protein: updated.nutritionProtein,
          carbohydrates: updated.nutritionCarbohydrates,
          fat: updated.nutritionFat,
          fiber: updated.nutritionFiber,
          sodium: updated.nutritionSodium,
        },
        steps,
        ingredients,
        rowVersion: updated.rowVersion,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    });

    await this.cache.delete('recipes');
    return result;
  }

  private mapNutrition(nutrition: UpdateRecipeNutritionDto | undefined) {
    if (!nutrition) return {};

    return {
      ...(nutrition.calories !== undefined && {
        nutritionCalories: this.toDecimal(nutrition.calories),
      }),
      ...(nutrition.protein !== undefined && {
        nutritionProtein: this.toDecimal(nutrition.protein),
      }),
      ...(nutrition.carbohydrates !== undefined && {
        nutritionCarbohydrates: this.toDecimal(nutrition.carbohydrates),
      }),
      ...(nutrition.fat !== undefined && {
        nutritionFat: this.toDecimal(nutrition.fat),
      }),
      ...(nutrition.fiber !== undefined && {
        nutritionFiber: this.toDecimal(nutrition.fiber),
      }),
      ...(nutrition.sodium !== undefined && {
        nutritionSodium: this.toDecimal(nutrition.sodium),
      }),
    };
  }

  private toDecimal(value: number | null | undefined): string | null {
    return value === null || value === undefined ? null : value.toString();
  }
}
