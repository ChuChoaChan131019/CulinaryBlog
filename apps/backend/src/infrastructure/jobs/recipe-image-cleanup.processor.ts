import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import {
  FILE_STORAGE,
  IFileStorageService,
} from '../../modules/media/file-storage.service';
import {
  RecipeImageCleanupJob,
  RECIPE_IMAGE_CLEANUP_QUEUE,
} from './recipe-image-cleanup.queue';

@Injectable()
export class RecipeImageCleanupProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly connection: Redis;
  private worker?: Worker<RecipeImageCleanupJob>;

  constructor(
    config: ConfigService,
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorageService,
  ) {
    this.connection = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
  }

  onModuleInit(): void {
    this.worker = new Worker<RecipeImageCleanupJob>(
      RECIPE_IMAGE_CLEANUP_QUEUE,
      async (job: Job<RecipeImageCleanupJob>) => {
        for (const objectKey of job.data.objectKeys) {
          await this.fileStorage.deleteAsync(objectKey);
        }
      },
      { connection: this.connection },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection.quit();
  }
}
