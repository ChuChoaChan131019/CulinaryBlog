import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { MailService } from '../mail/mail.service';
import {
  WELCOME_EMAIL_QUEUE,
  getWelcomeEmailRetryDelay,
  type WelcomeEmailJob,
} from './welcome-email.queue';

@Injectable()
export class WelcomeEmailProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WelcomeEmailProcessor.name);
  private readonly connection: Redis;
  private worker?: Worker<WelcomeEmailJob>;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(MailService) private readonly mailService: MailService,
  ) {
    this.connection = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
  }

  onModuleInit(): void {
    this.worker = new Worker<WelcomeEmailJob>(
      WELCOME_EMAIL_QUEUE,
      (job: Job<WelcomeEmailJob>) => processWelcomeEmail(this.mailService, job),
      {
        connection: this.connection,
        settings: {
          backoffStrategy: (attemptsMade: number) =>
            getWelcomeEmailRetryDelay(attemptsMade),
        },
      },
    );

    this.worker.on('failed', (job, error) => {
      if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;

      this.logger.error(
        `Welcome email job ${job.id ?? 'unknown'} failed after ${job.attemptsMade} attempts: ${error.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection.quit();
  }
}

export async function processWelcomeEmail(
  mailService: Pick<MailService, 'sendWelcomeEmail'>,
  job: Pick<Job<WelcomeEmailJob>, 'data'>,
): Promise<void> {
  await mailService.sendWelcomeEmail({
    to: job.data.email,
    displayName: job.data.displayName,
    appUrl: job.data.appUrl,
  });
}
