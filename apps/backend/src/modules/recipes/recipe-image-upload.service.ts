import { Injectable, Logger } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { RecipeImageResizeQueue } from '../../infrastructure/jobs/recipe-image-resize.queue';
import {
  RecipeImageResponse,
  RecipeImageUploadResponse,
  RecipeImagesService,
} from '../media/recipe-images.service';
import { UploadFile } from '../media/file-storage.service';

@Injectable()
export class RecipeImageUploadService {
  private readonly logger = new Logger(RecipeImageUploadService.name);

  constructor(
    private readonly recipeImages: RecipeImagesService,
    private readonly resizeQueue: RecipeImageResizeQueue,
  ) {}

  async upload(
    recipeId: string,
    user: AuthenticatedUser,
    file: UploadFile,
    altText?: string,
  ): Promise<RecipeImageResponse> {
    const image: RecipeImageUploadResponse = await this.recipeImages.upload(
      recipeId,
      user,
      file,
      altText,
    );

    try {
      await this.resizeQueue.enqueue({
        imageId: image.imageId,
        recipeId,
        sourceObjectKey: image.objectKey,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Không thể enqueue job resize imageId=${image.imageId} ` +
          `recipeId=${recipeId}: ${detail}`,
      );
    }

    return {
      imageId: image.imageId,
      originalUrl: image.originalUrl,
      altText: image.altText,
      isPrimary: image.isPrimary,
    };
  }
}
