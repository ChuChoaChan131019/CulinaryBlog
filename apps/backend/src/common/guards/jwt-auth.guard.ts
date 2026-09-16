import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, eq } from 'drizzle-orm';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/authenticated-user';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../infrastructure/database/database.module';
import { users } from '../../infrastructure/database/schema';

interface AccessTokenPayload {
  sub?: string;
  userId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        },
      );
      const userId = payload.sub ?? payload.userId;
      if (!userId) throw new UnauthorizedException();

      const [user] = await this.db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.isActive, true),
            eq(users.isDeleted, false),
          ),
        )
        .limit(1);

      if (!user) throw new UnauthorizedException();
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
