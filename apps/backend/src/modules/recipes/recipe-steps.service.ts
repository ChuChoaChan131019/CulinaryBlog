import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { DATABASE_CONNECTION, Database } from '../../infrastructure/database/database.module';
import { recipeSteps, recipes } from '../../infrastructure/database/schema';
import { CreateRecipeStepDto, UpdateRecipeStepDto } from './dto/recipe-step.dto';
import { RecipeStepResponseDto } from './dto/recipe.dto';

@Injectable()
export class RecipeStepsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async list(recipeId: string, user: AuthenticatedUser): Promise<RecipeStepResponseDto[]> {
    await this.getOwnedRecipe(recipeId, user);
    const rows = await this.db.select().from(recipeSteps)
      .where(and(eq(recipeSteps.recipeId, recipeId), eq(recipeSteps.isDeleted, false)))
      .orderBy(asc(recipeSteps.stepNumber));
    return rows.map((row) => this.toResponse(row));
  }

  async create(recipeId: string, dto: CreateRecipeStepDto, user: AuthenticatedUser): Promise<RecipeStepResponseDto> {
    await this.getOwnedRecipe(recipeId, user);
    const [row] = await this.db.transaction(async (tx) => {
      // Serialize appends for one recipe so concurrent requests cannot choose
      // the same next step number.
      await tx.select({ id: recipes.id })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .for('update');

      const [lastStep] = await tx.select({ stepNumber: recipeSteps.stepNumber })
        .from(recipeSteps)
        .where(and(eq(recipeSteps.recipeId, recipeId), eq(recipeSteps.isDeleted, false)))
        .orderBy(desc(recipeSteps.stepNumber))
        .limit(1);

      return tx.insert(recipeSteps).values({
        recipeId,
        stepNumber: (lastStep?.stepNumber ?? 0) + 1,
        title: dto.title.trim(),
        description: dto.description.trim(),
        timerMinutes: dto.timerMinutes,
        imageUrl: dto.imageUrl,
      }).returning();
    });
    if (!row) throw new Error('Recipe step insert returned no row.');
    await this.cache.delete('recipes');
    return this.toResponse(row);
  }

  async update(recipeId: string, stepId: string, dto: UpdateRecipeStepDto, user: AuthenticatedUser): Promise<RecipeStepResponseDto> {
    await this.getOwnedRecipe(recipeId, user);
    const [row] = await this.db.update(recipeSteps).set({
      title: dto.title.trim(),
      description: dto.description.trim(),
      timerMinutes: dto.timerMinutes,
      imageUrl: dto.imageUrl,
      updatedAt: new Date(),
      rowVersion: sql`${recipeSteps.rowVersion} + 1`,
    }).where(and(eq(recipeSteps.id, stepId), eq(recipeSteps.recipeId, recipeId), eq(recipeSteps.isDeleted, false))).returning();
    if (!row) throw this.notFound();
    await this.cache.delete('recipes');
    return this.toResponse(row);
  }

  async remove(recipeId: string, stepId: string, user: AuthenticatedUser): Promise<void> {
    await this.getOwnedRecipe(recipeId, user);
    await this.db.transaction(async (tx) => {
      await tx.select({ id: recipes.id })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .for('update');

      const [deleted] = await tx.update(recipeSteps).set({
        isDeleted: true,
        updatedAt: new Date(),
        rowVersion: sql`${recipeSteps.rowVersion} + 1`,
      }).where(and(eq(recipeSteps.id, stepId), eq(recipeSteps.recipeId, recipeId), eq(recipeSteps.isDeleted, false))).returning({ id: recipeSteps.id });
      if (!deleted) throw this.notFound();
      const remaining = await tx.select({ id: recipeSteps.id }).from(recipeSteps)
        .where(and(eq(recipeSteps.recipeId, recipeId), eq(recipeSteps.isDeleted, false)))
        .orderBy(asc(recipeSteps.stepNumber), asc(recipeSteps.createdAt));
      for (const [index, step] of remaining.entries()) {
        await tx.update(recipeSteps).set({
          stepNumber: index + 1,
          updatedAt: new Date(),
          rowVersion: sql`${recipeSteps.rowVersion} + 1`,
        }).where(eq(recipeSteps.id, step.id));
      }
    });
    await this.cache.delete('recipes');
  }

  private async getOwnedRecipe(recipeId: string, user: AuthenticatedUser) {
    const [recipe] = await this.db.select({ id: recipes.id, authorId: recipes.authorId }).from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.isDeleted, false))).limit(1);
    if (!recipe) throw new NotFoundException({ type: 'RECIPE_NOT_FOUND', status: 404 });
    if (user.role !== 'Admin' && recipe.authorId !== user.id) throw new ForbiddenException({ type: 'RECIPE_FORBIDDEN', status: 403 });
  }

  private notFound(): NotFoundException { return new NotFoundException({ type: 'RECIPE_STEP_NOT_FOUND', status: 404 }); }
  private toResponse(row: typeof recipeSteps.$inferSelect): RecipeStepResponseDto {
    return { id: row.id, stepNumber: row.stepNumber, title: row.title, description: row.description, timerMinutes: row.timerMinutes, imageUrl: row.imageUrl };
  }
}
