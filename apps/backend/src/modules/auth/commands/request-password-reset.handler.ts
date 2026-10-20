import { randomBytes } from 'node:crypto';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import { passwordResetTokens, users } from '../../../infrastructure/database/schema';
import { PasswordResetEmailQueue } from '../../../infrastructure/jobs/password-reset-email.queue';
import { hashToken } from '../hash-token';
import { RequestPasswordResetCommand } from './request-password-reset.command';

const TOKEN_TTL_MINUTES = 30;

@CommandHandler(RequestPasswordResetCommand)
export class RequestPasswordResetHandler
  implements ICommandHandler<RequestPasswordResetCommand, void>
{
  private readonly logger = new Logger(RequestPasswordResetHandler.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PasswordResetEmailQueue)
    private readonly passwordResetEmailQueue: PasswordResetEmailQueue,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const { email } = command;

    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    // Không tiết lộ email có tồn tại hay không — nếu không có user thì không làm gì
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const appUrl = this.config.get<string>('AUTH_URL', 'http://localhost:3000');
    const resetUrl = `${appUrl.replace(/\/+$/, '')}/reset-password?token=${rawToken}`;

    try {
      await this.passwordResetEmailQueue.enqueue({
        email: user.email,
        displayName: user.displayName,
        resetUrl,
      });
    } catch (error) {
      this.logger.error(
        `Failed to enqueue password reset email for ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
