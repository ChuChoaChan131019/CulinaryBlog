import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../../infrastructure/database/database.module';
import {
  recipeIngredients,
  recipes,
  recipeSteps,
} from '../../../infrastructure/database/schema';
import { RecipeDto } from '../dto/recipe.dto';

type TargetStatus = 'Draft' | 'Published' | 'Archived';

@Injectable()
export class RecipeStatusService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  publish(recipeId: string, user: AuthenticatedUser): Promise<RecipeDto> {
    return this.transition(recipeId, user, 'Published');
  }

  unpublish(recipeId: string, user: AuthenticatedUser): Promise<RecipeDto> {
    return this.transition(recipeId, user, 'Draft');
  }

  archive(recipeId: string, user: AuthenticatedUser): Promise<RecipeDto> {
    return this.transition(recipeId, user, 'Archived');
  }

  private async transition(
    recipeId: string,
    user: AuthenticatedUser,
    targetStatus: TargetStatus,
  ): Promise<RecipeDto> {
    const result = await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.isDeleted, false)))
        .limit(1);

      if (!existing) {
        throw new NotFoundException({
          type: 'RECIPE_NOT_FOUND',
          title: 'Không tìm thấy công thức',
          status: 404,
          detail: 'Công thức không tồn tại hoặc đã bị xóa',
        });
      }

      if (user.role !== 'Admin' && existing.authorId !== user.id) {
        throw new ForbiddenException({
          type: 'RECIPE_FORBIDDEN',
          title: 'Không có quyền thay đổi trạng thái công thức',
          status: 403,
          detail: 'Bạn không phải tác giả của công thức này',
        });
      }

      if (existing.status === 'Archived' && targetStatus !== 'Archived') {
        throw new UnprocessableEntityException({
          type: 'RECIPE_INVALID_STATUS_TRANSITION',
          title: 'Không thể thay đổi trạng thái công thức',
          status: 422,
          detail: 'Công thức đã lưu trữ không thể xuất bản hoặc hủy xuất bản',
        });
      }

      let recipe = existing;
      let changed = false;

      if (existing.status !== targetStatus) {
        if (targetStatus === 'Published') {
          const [step] = await tx
            .select({ id: recipeSteps.id })
            .from(recipeSteps)
            .where(
              and(
                eq(recipeSteps.recipeId, recipeId),
                eq(recipeSteps.isDeleted, false),
              ),
            )
            .limit(1);

          if (!step) {
            throw new UnprocessableEntityException({
              type: 'RECIPE_PUBLISH_INCOMPLETE',
              title: 'Công thức chưa đủ điều kiện xuất bản',
              status: 422,
              detail: 'Công thức phải có ít nhất một bước thực hiện',
            });
          }
        }

        const [updated] = await tx
          .update(recipes)
          .set({
            status: targetStatus,
            ...(targetStatus === 'Published' && {
              publishedAt: existing.publishedAt ?? new Date(),
            }),
            updatedAt: new Date(),
            rowVersion: sql`${recipes.rowVersion} + 1`,
          })
          .where(
            and(
              eq(recipes.id, recipeId),
              eq(recipes.isDeleted, false),
              eq(recipes.status, existing.status),
            ),
          )
          .returning();

        if (!updated) {
          const [current] = await tx
            .select()
            .from(recipes)
            .where(and(eq(recipes.id, recipeId), eq(recipes.isDeleted, false)))
            .limit(1);

          if (current?.status === targetStatus) {
            recipe = current;
          } else {
            throw new ConflictException({
              type: 'RECIPE_CONCURRENCY_CONFLICT',
              title: 'Xung đột cập nhật trạng thái công thức',
              status: 409,
              detail:
                'Trạng thái công thức đã được cập nhật bởi yêu cầu khác; hãy tải lại dữ liệu',
            });
          }
        } else {
          recipe = updated;
          changed = true;
        }
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
              eq(recipeSteps.recipeId, recipe.id),
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
              eq(recipeIngredients.recipeId, recipe.id),
              eq(recipeIngredients.isDeleted, false),
            ),
          )
          .orderBy(asc(recipeIngredients.orderIndex)),
      ]);

      return {
        changed,
        recipe: {
          id: recipe.id,
          title: recipe.title,
          slug: recipe.slug,
          description: recipe.description,
          instructions: recipe.instructions,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          status: recipe.status,
          categoryId: recipe.categoryId,
          authorId: recipe.authorId,
          nutrition: {
            calories: recipe.nutritionCalories,
            protein: recipe.nutritionProtein,
            carbohydrates: recipe.nutritionCarbohydrates,
            fat: recipe.nutritionFat,
            fiber: recipe.nutritionFiber,
            sodium: recipe.nutritionSodium,
          },
          steps,
          ingredients,
          rowVersion: recipe.rowVersion,
          createdAt: recipe.createdAt,
          updatedAt: recipe.updatedAt,
        },
      };
    });

    if (result.changed) await this.cache.delete('recipes');
    return result.recipe;
  }
}
