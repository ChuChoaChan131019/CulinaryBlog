import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { FileStorageService } from '../../modules/media/file-storage.service';
import {
  SITEMAP_GENERATION_QUEUE,
  type SitemapGenerationJob,
} from './sitemap-generation.queue';
import {
  SitemapGeneratorService,
  type SitemapGenerationResult,
} from './sitemap-generator.service';

export const SITEMAP_OBJECT_KEY = 'sitemap.xml';

export type SitemapGenerationStage = 'generate' | 'upload';

export async function processSitemapGeneration(
  generator: Pick<SitemapGeneratorService, 'generate'>,
  storage: Pick<FileStorageService, 'putAsync'>,
  onStage?: (stage: SitemapGenerationStage) => void,
): Promise<SitemapGenerationResult> {
  onStage?.('generate');
  const result = await generator.generate();
  onStage?.('upload');
  await storage.putAsync(SITEMAP_OBJECT_KEY, {
    buffer: Buffer.from(result.xml, 'utf8'),
    contentType: 'application/xml; charset=utf-8',
  });
  return result;
}

@Injectable()
export class SitemapGenerationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SitemapGenerationProcessor.name);
  private readonly connection: Redis;
  private worker?: Worker<SitemapGenerationJob>;

  constructor(
    config: ConfigService,
    private readonly generator: SitemapGeneratorService,
    private readonly storage: FileStorageService,
  ) {
    this.connection = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
  }

  onModuleInit(): void {
    this.worker = new Worker<SitemapGenerationJob>(
      SITEMAP_GENERATION_QUEUE,
      (job) => this.process(job),
      { connection: this.connection },
    );

    this.worker.on('failed', (job, error) => {
      if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
      this.logger.error(
        `event=sitemap.failed jobId=${job.id ?? 'unknown'} ` +
          `attempt=${job.attemptsMade} error=${error.message}`,
      );
    });
  }

  private async process(job: Job<SitemapGenerationJob>): Promise<void> {
    const startedAt = Date.now();
    let stage: SitemapGenerationStage = 'generate';
    try {
      const result = await processSitemapGeneration(
        this.generator,
        this.storage,
        (currentStage) => {
          stage = currentStage;
        },
      );
      this.logger.log(
        `event=sitemap.generated jobId=${job.id ?? 'unknown'} ` +
          `attempt=${job.attemptsMade + 1} urlCount=${result.urlCount} ` +
          `recipeCount=${result.recipeCount} categoryCount=${result.categoryCount} ` +
          `objectKey=${SITEMAP_OBJECT_KEY} durationMs=${Date.now() - startedAt}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `event=sitemap.attempt_failed jobId=${job.id ?? 'unknown'} ` +
          `attempt=${job.attemptsMade + 1} stage=${stage} error=${message}`,
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection.quit();
  }
}
