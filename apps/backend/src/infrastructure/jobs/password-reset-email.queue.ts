import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const PASSWORD_RESET_EMAIL_QUEUE = 'password-reset-email';
export const PASSWORD_RESET_EMAIL_RETRY_DELAYS = [60_000, 300_000, 1_800_000] as const;

export function getPasswordResetEmailRetryDelay(attemptsMade: number): number {
  return PASSWORD_RESET_EMAIL_RETRY_DELAYS[
    Math.min(Math.max(attemptsMade, 0), PASSWORD_RESET_EMAIL_RETRY_DELAYS.length - 1)
  ];
}

export interface PasswordResetEmailJob {
  email: string;
  displayName: string;
  resetUrl: string;
}

@Injectable()
export class PasswordResetEmailQueue implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queue: Queue<PasswordResetEmailJob>;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.connection = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue<PasswordResetEmailJob>(PASSWORD_RESET_EMAIL_QUEUE, {
      connection: this.connection,
    });
  }

  async enqueue(job: PasswordResetEmailJob): Promise<void> {
    await this.queue.add('send-password-reset-email', job, {
      attempts: 3,
      backoff: { type: 'custom' },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
