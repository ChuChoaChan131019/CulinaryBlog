import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const SITEMAP_GENERATION_QUEUE = 'sitemap-generation';
export const SITEMAP_SCHEDULER_ID = 'daily-sitemap-generation';
export const SITEMAP_GENERATION_JOB = 'generate-sitemap';
export const SITEMAP_SCHEDULE = {
  pattern: '0 2 * * *',
  tz: 'UTC',
} as const;

export interface SitemapGenerationJob {
  reason: 'scheduled';
}

export const SITEMAP_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 60_000 },
  removeOnComplete: { count: 30 },
  removeOnFail: false,
} as const;

@Injectable()
export class SitemapGenerationQueue implements OnModuleInit, OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queue: Queue<SitemapGenerationJob>;

  constructor(config: ConfigService) {
    this.connection = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue<SitemapGenerationJob>(SITEMAP_GENERATION_QUEUE, {
      connection: this.connection,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      SITEMAP_SCHEDULER_ID,
      SITEMAP_SCHEDULE,
      {
        name: SITEMAP_GENERATION_JOB,
        data: { reason: 'scheduled' },
        opts: SITEMAP_JOB_OPTIONS,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
