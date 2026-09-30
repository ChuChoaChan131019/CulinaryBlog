import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { and, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import { users } from '../../../infrastructure/database/schema';
import { authAccountDisabled, authAccountLocked, authInvalidCredentials } from '../auth.exceptions';
import { TokenPair, issueTokens } from './issue-tokens';
import { LoginCommand } from './login.command';

export type LoginResult = TokenPair;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, LoginResult> {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const { email, password } = command;

    const [user] = await this.db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    // Không tiết lộ email có tồn tại hay không (AUTH_INVALID_CREDENTIALS chung chung).
    if (!user || !user.passwordHash) throw authInvalidCredentials();

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) throw authAccountLocked();

    if (!(await argon2.verify(user.passwordHash, password))) {
      const attempts = user.failedLoginAttempts + 1;
      const locked = attempts >= MAX_FAILED_ATTEMPTS;
      await this.db
        .update(users)
        .set({
          failedLoginAttempts: locked ? 0 : attempts,
          lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
        })
        .where(eq(users.id, user.id));
      throw authInvalidCredentials();
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.db
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, user.id));
    }

    if (!user.isActive) {
      throw authAccountDisabled();
    }

    return issueTokens(this.db, this.jwtService, this.config, user.id, command.ip);
  }
}
