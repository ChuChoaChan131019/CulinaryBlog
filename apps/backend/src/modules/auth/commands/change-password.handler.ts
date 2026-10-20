import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import { refreshTokens, users } from '../../../infrastructure/database/schema';
import { authInvalidCredentials, authPasswordNotSet } from '../auth.exceptions';
import { ChangePasswordCommand } from './change-password.command';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand, void> {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const { userId, currentPassword, newPassword } = command;

    const [user] = await this.db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) throw authInvalidCredentials();
    if (!user.passwordHash) throw authPasswordNotSet();

    const matches = await argon2.verify(user.passwordHash, currentPassword);
    if (!matches) throw authInvalidCredentials();

    const nextHash = await argon2.hash(newPassword);

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: nextHash })
        .where(eq(users.id, userId));

      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, userId),
            isNull(refreshTokens.revokedAt),
          ),
        );
    });
  }
}
