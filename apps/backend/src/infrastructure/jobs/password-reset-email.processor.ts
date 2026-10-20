import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { MailService } from '../mail/mail.service';
import {
  PASSWORD_RESET_EMAIL_QUEUE,
  getPasswordResetEmailRetryDelay,
  type PasswordResetEmailJob,
} from './password-reset-email.queue';

@Injectable()
export class PasswordResetEmailProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PasswordResetEmailProcessor.name);
  private readonly connection: Redis;
  private worker?: Worker<PasswordResetEmailJob>;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(MailService) private readonly mailService: MailService,
  ) {
    this.connection = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
  }

  onModuleInit(): void {
    this.worker = new Worker<PasswordResetEmailJob>(
      PASSWORD_RESET_EMAIL_QUEUE,
      (job: Job<PasswordResetEmailJob>) => processPasswordResetEmail(this.mailService, job),
      {
        connection: this.connection,
        settings: {
          backoffStrategy: (attemptsMade: number) =>
            getPasswordResetEmailRetryDelay(attemptsMade),
        },
      },
    );

    this.worker.on('failed', (job, error) => {
      if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;

      this.logger.error(
        `Password reset email job ${job.id ?? 'unknown'} failed after ${job.attemptsMade} attempts: ${error.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection.quit();
  }
}

export async function processPasswordResetEmail(
  mailService: Pick<MailService, 'sendPasswordResetEmail'>,
  job: Pick<Job<PasswordResetEmailJob>, 'data'>,
): Promise<void> {
  await mailService.sendPasswordResetEmail({
    to: job.data.email,
    displayName: job.data.displayName,
    resetUrl: job.data.resetUrl,
  });
}
