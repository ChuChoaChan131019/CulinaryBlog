import { ForbiddenException, HttpException, HttpStatus, Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { and, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import { users } from '../../../infrastructure/database/schema';
import { LoginCommand } from './login.command';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const INVALID_CREDENTIALS = () =>
  new UnauthorizedException({
    type: 'about:blank',
    title: 'Sai email hoặc mật khẩu',
    status: 401,
    detail: 'AUTH_INVALID_CREDENTIALS',
  });

const ACCOUNT_LOCKED = () =>
  new HttpException(
    {
      type: 'about:blank',
      title: `Tài khoản tạm khóa do đăng nhập sai quá ${MAX_FAILED_ATTEMPTS} lần, thử lại sau ${LOCKOUT_MINUTES} phút`,
      status: HttpStatus.LOCKED,
      detail: 'AUTH_ACCOUNT_LOCKED',
    },
    HttpStatus.LOCKED,
  );

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
    if (!user || !user.passwordHash) throw INVALID_CREDENTIALS();

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) throw ACCOUNT_LOCKED();

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
      throw INVALID_CREDENTIALS();
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.db
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, user.id));
    }

    if (!user.isActive) {
      throw new ForbiddenException({
        type: 'about:blank',
        title: 'Tài khoản đã bị vô hiệu hóa',
        status: 403,
        detail: 'AUTH_ACCOUNT_DISABLED',
      });
    }

    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const payload = { sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as JwtSignOptions['expiresIn'],
    });
    // ponytail: refresh token ở đây chỉ là JWT ký rời, chưa lưu tokenHash/rotation/reuse-detection
    // trong DB như spec (refresh_tokens table chưa tồn tại) — nên /auth/refresh, /auth/logout chưa
    // implement được. Upgrade: thêm bảng refresh_tokens + handler refresh/logout khi cần.
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as JwtSignOptions['expiresIn'],
    });

    const { exp, iat } = this.jwtService.decode<{ exp: number; iat: number }>(accessToken);

    return { accessToken, refreshToken, expiresIn: exp - iat };
  }
}
