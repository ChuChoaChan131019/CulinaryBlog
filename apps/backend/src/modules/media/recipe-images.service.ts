import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../infrastructure/database/database.module';
import {
  recipeImages,
  recipes,
} from '../../infrastructure/database/schema';
import {
  FileStorageService,
  UploadFile,
  variantObjectKey,
} from './file-storage.service';

export interface RecipeImageResponse {
  imageId: string;
  originalUrl: string;
  altText: string | null;
  isPrimary: boolean;
}

export interface RecipeImageUploadResponse extends RecipeImageResponse {
  objectKey: string;
}

@Injectable()
export class RecipeImagesService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly fileStorage: FileStorageService,
  ) {}

  async upload(
    recipeId: string,
    user: AuthenticatedUser,
    file: UploadFile,
    altText?: string,
  ): Promise<RecipeImageUploadResponse> {
    const normalizedAltText = this.normalizeAltText(altText);
    const recipe = await this.getOwnedRecipe(recipeId, user);
    const stored = await this.fileStorage.uploadAsync(file, `recipes/${recipe.id}`);

    try {
      return await this.db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: recipeImages.id })
          .from(recipeImages)
          .where(
            and(
              eq(recipeImages.recipeId, recipe.id),
              eq(recipeImages.isDeleted, false),
            ),
          )
          .limit(1);
        const [image] = await tx
          .insert(recipeImages)
          .values({
            recipeId: recipe.id,
            originalUrl: stored.url,
            objectKey: stored.key,
            altText: normalizedAltText,
            isPrimary: !existing,
          })
          .returning();
        if (!image) throw new Error('Recipe image insert returned no row.');

        return { ...this.toResponse(image), objectKey: image.objectKey };
      });
    } catch (error) {
      await this.fileStorage.deleteAsync(stored.key).catch(() => undefined);
      throw error;
    }
  }

  async setPrimary(
    recipeId: string,
    imageId: string,
    user: AuthenticatedUser,
  ): Promise<RecipeImageResponse> {
    await this.getOwnedRecipe(recipeId, user);

    return this.db.transaction(async (tx) => {
      const [image] = await tx
        .select()
        .from(recipeImages)
        .where(
          and(
            eq(recipeImages.id, imageId),
            eq(recipeImages.recipeId, recipeId),
            eq(recipeImages.isDeleted, false),
          ),
        )
        .limit(1);
      if (!image) throw this.imageNotFound();

      await tx
        .update(recipeImages)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(recipeImages.recipeId, recipeId),
            eq(recipeImages.isDeleted, false),
          ),
        );
      const [updated] = await tx
        .update(recipeImages)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(eq(recipeImages.id, imageId))
        .returning();
      if (!updated) throw new Error('Recipe image update returned no row.');

      return this.toResponse(updated);
    });
  }

  async remove(
    recipeId: string,
    imageId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.getOwnedRecipe(recipeId, user);
    const deleted = await this.db.transaction(async (tx) => {
      const [image] = await tx
        .select()
        .from(recipeImages)
        .where(
          and(
            eq(recipeImages.id, imageId),
            eq(recipeImages.recipeId, recipeId),
            eq(recipeImages.isDeleted, false),
          ),
        )
        .limit(1);
      if (!image) throw this.imageNotFound();

      await tx.delete(recipeImages).where(eq(recipeImages.id, imageId));
      if (image.isPrimary) {
        const [next] = await tx
          .select({ id: recipeImages.id })
          .from(recipeImages)
          .where(
            and(
              eq(recipeImages.recipeId, recipeId),
              eq(recipeImages.isDeleted, false),
            ),
          )
          .orderBy(asc(recipeImages.orderIndex), asc(recipeImages.createdAt))
          .limit(1);
        if (next) {
          await tx
            .update(recipeImages)
            .set({ isPrimary: true, updatedAt: new Date() })
            .where(eq(recipeImages.id, next.id));
        }
      }
      return image;
    });

    await Promise.all([
      deleted.objectKey,
      variantObjectKey(deleted.objectKey, 'medium'),
      variantObjectKey(deleted.objectKey, 'thumbnail'),
    ].map((key) => this.fileStorage.deleteAsync(key)));
  }

  private async getOwnedRecipe(recipeId: string, user: AuthenticatedUser) {
    const [recipe] = await this.db
      .select({ id: recipes.id, authorId: recipes.authorId })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.isDeleted, false)))
      .limit(1);
    if (!recipe) {
      throw new NotFoundException({ type: 'RECIPE_NOT_FOUND', status: 404 });
    }
    if (user.role !== 'Admin' && recipe.authorId !== user.id) {
      throw new ForbiddenException({ type: 'RECIPE_FORBIDDEN', status: 403 });
    }
    return recipe;
  }

  private normalizeAltText(altText?: string): string | null {
    const value = altText?.trim() || null;
    if (value && value.length > 200) {
      throw new BadRequestException({
        type: 'VALIDATION_ERROR',
        detail: 'altText must not exceed 200 characters.',
      });
    }
    return value;
  }

  private imageNotFound(): NotFoundException {
    return new NotFoundException({ type: 'RECIPE_IMAGE_NOT_FOUND', status: 404 });
  }

  private toResponse(image: typeof recipeImages.$inferSelect): RecipeImageResponse {
    return {
      imageId: image.id,
      originalUrl: image.originalUrl,
      altText: image.altText,
      isPrimary: image.isPrimary,
    };
  }
}
