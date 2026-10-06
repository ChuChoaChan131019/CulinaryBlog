import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { and, eq } from 'drizzle-orm';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../../infrastructure/database/database.module';
import { recipeImages, recipes } from '../../../infrastructure/database/schema';
import { RecipeImageCleanupQueue } from '../../../infrastructure/jobs/recipe-image-cleanup.queue';
import { DeleteRecipeCommand } from './delete-recipe.command';

@Injectable()
@CommandHandler(DeleteRecipeCommand)
export class DeleteRecipeHandler implements ICommandHandler<
  DeleteRecipeCommand,
  void
> {
  private readonly logger = new Logger(DeleteRecipeHandler.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
    private readonly imageCleanup: RecipeImageCleanupQueue,
  ) {}

  async execute(command: DeleteRecipeCommand): Promise<void> {
    const objectKeys = await this.db.transaction(async (tx) => {
      const [recipe] = await tx
        .select({ id: recipes.id, authorId: recipes.authorId })
        .from(recipes)
        .where(
          and(eq(recipes.id, command.recipeId), eq(recipes.isDeleted, false)),
        )
        .limit(1);

      if (!recipe) {
        throw new NotFoundException({
          type: 'RECIPE_NOT_FOUND',
          status: 404,
        });
      }

      if (
        command.user.role !== 'Admin' &&
        recipe.authorId !== command.user.id
      ) {
        throw new ForbiddenException({
          type: 'RECIPE_FORBIDDEN',
          status: 403,
        });
      }

      const images = await tx
        .select({ objectKey: recipeImages.objectKey })
        .from(recipeImages)
        .where(eq(recipeImages.recipeId, recipe.id));

      await tx.delete(recipes).where(eq(recipes.id, recipe.id));

      return images.map((image) => image.objectKey);
    });

    await this.cache.delete('recipes');

    // DB deletion is the synchronous source of truth; MinIO cleanup is queued
    // after commit so object-storage latency never blocks the 204 response.
    void this.imageCleanup
      .enqueue({ recipeId: command.recipeId, objectKeys })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Không thể enqueue job xóa ảnh recipe ${command.recipeId} ` +
            `(imageCount=${objectKeys.length}): ${detail}`,
        );
      });
  }
}
