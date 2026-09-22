import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { LoginHandler } from './commands/login.handler';
import { RegisterHandler } from './commands/register.handler';

const CommandHandlers = [RegisterHandler, LoginHandler];

@Module({
  imports: [
    CqrsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    // NFR: rate limit /auth/* — 10 request/phút/IP (429 kèm header Retry-After).
    // ponytail: in-memory storage, chỉ đúng khi chạy 1 instance backend; upgrade sang
    // ThrottlerStorageRedisService nếu scale nhiều instance.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AuthController],
  providers: [...CommandHandlers, ThrottlerGuard],
})
export class AuthModule {}
