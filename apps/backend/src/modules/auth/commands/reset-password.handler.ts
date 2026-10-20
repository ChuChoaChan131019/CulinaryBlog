import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import {
  passwordResetTokens,
  refreshTokens,
  users,
} from '../../../infrastructure/database/schema';
import { authResetTokenInvalid } from '../auth.exceptions';
import { hashToken } from '../hash-token';
import { ResetPasswordCommand } from './reset-password.command';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand, void> {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const { token, newPassword } = command;
    const tokenHash = hashToken(token);

    const [resetToken] = await this.db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
        isDeleted: passwordResetTokens.isDeleted,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (
      !resetToken ||
      resetToken.isDeleted ||
      resetToken.usedAt !== null ||
      resetToken.expiresAt.getTime() <= Date.now()
    ) {
      throw authResetTokenInvalid();
    }

    const newPasswordHash = await argon2.hash(newPassword);

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(users.id, resetToken.userId));

      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));

      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, resetToken.userId),
            isNull(refreshTokens.revokedAt),
          ),
        );
    });
  }
}
