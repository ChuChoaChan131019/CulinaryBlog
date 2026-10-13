import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { DATABASE_CONNECTION, Database } from '../database/database.module';
import { recipeImages } from '../database/schema';
import {
  FILE_STORAGE,
  IFileStorageService,
  StoredFile,
  variantObjectKey,
} from '../../modules/media/file-storage.service';
import {
  RecipeImageResizeJob,
  RECIPE_IMAGE_RESIZE_QUEUE,
} from './recipe-image-resize.queue';
import { RecipeImageVariantsService } from './recipe-image-variants.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class RecipeImageResizeProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RecipeImageResizeProcessor.name);
  private readonly connection: Redis;
  private worker?: Worker<RecipeImageResizeJob>;

  constructor(
    config: ConfigService,
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorageService,
    private readonly variants: RecipeImageVariantsService,
    private readonly cache: CacheService,
  ) {
    this.connection = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
  }

  onModuleInit(): void {
    this.worker = new Worker<RecipeImageResizeJob>(
      RECIPE_IMAGE_RESIZE_QUEUE,
      (job) => this.process(job),
      { connection: this.connection },
    );
    this.worker.on('failed', (job, error) => {
      if (!job) return;
      this.logger.error(
        `Image resize job failed imageId=${job.data.imageId} ` +
          `recipeId=${job.data.recipeId} attempt=${job.attemptsMade}: ${error.message}`,
      );
    });
  }

  private async process(job: Job<RecipeImageResizeJob>): Promise<void> {
    const [image] = await this.db
      .select({
        id: recipeImages.id,
        recipeId: recipeImages.recipeId,
        objectKey: recipeImages.objectKey,
        mediumUrl: recipeImages.mediumUrl,
        thumbnailUrl: recipeImages.thumbnailUrl,
      })
      .from(recipeImages)
      .where(
        and(
          eq(recipeImages.id, job.data.imageId),
          eq(recipeImages.recipeId, job.data.recipeId),
          eq(recipeImages.isDeleted, false),
        ),
      )
      .limit(1);

    if (!image || (image.mediumUrl && image.thumbnailUrl)) return;

    const sourceKey = image.objectKey || job.data.sourceObjectKey;
    const source = await this.fileStorage.readAsync(sourceKey);
    const generated = await this.variants.create(source);
    const stored: StoredFile[] = [];
    try {
      for (const variant of generated) {
        stored.push(
          await this.fileStorage.putAsync(
            variantObjectKey(sourceKey, variant.variant),
            {
              buffer: variant.buffer,
              contentType: variant.contentType,
            },
          ),
        );
      }
    } catch (error) {
      await Promise.all(
        stored.map((file) =>
          this.fileStorage.deleteAsync(file.key).catch(() => undefined),
        ),
      );
      throw error;
    }
    const medium = stored.find((file) => file.key.endsWith('-medium.webp'));
    const thumbnail = stored.find((file) =>
      file.key.endsWith('-thumbnail.webp'),
    );
    if (!medium || !thumbnail)
      throw new Error('Image variants were not generated.');

    let updatedRows: Array<{ id: string }>;
    try {
      updatedRows = await this.db
        .update(recipeImages)
        .set({
          mediumUrl: medium.url,
          thumbnailUrl: thumbnail.url,
          updatedAt: new Date(),
          rowVersion: sql`${recipeImages.rowVersion} + 1`,
        })
        .where(
          and(
            eq(recipeImages.id, image.id),
            eq(recipeImages.recipeId, image.recipeId),
            eq(recipeImages.isDeleted, false),
          ),
        )
        .returning({ id: recipeImages.id });
    } catch (error) {
      await Promise.all(
        stored.map((file) =>
          this.fileStorage.deleteAsync(file.key).catch(() => undefined),
        ),
      );
      throw error;
    }

    const [updated] = updatedRows;

    if (!updated) {
      await Promise.all(
        stored.map((file) =>
          this.fileStorage.deleteAsync(file.key).catch(() => undefined),
        ),
      );
      return;
    }

    await this.cache.delete('recipes');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection.quit();
  }
}
