import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JobsModule } from '../../infrastructure/jobs/jobs.module';
import { AuthController } from './auth.controller';
import { GoogleLoginHandler } from './commands/google-login.handler';
import { LoginHandler } from './commands/login.handler';
import { LogoutHandler } from './commands/logout.handler';
import { RefreshTokenHandler } from './commands/refresh-token.handler';
import { RegisterHandler } from './commands/register.handler';
import { UpdateProfileHandler } from './commands/update-profile.handler';
import { GetMeHandler } from './queries/get-me.handler';

const CommandHandlers = [
  RegisterHandler,
  LoginHandler,
  RefreshTokenHandler,
  GoogleLoginHandler,
  LogoutHandler,
  UpdateProfileHandler,
];

const QueryHandlers = [GetMeHandler];

@Module({
  imports: [
    CqrsModule,
    JobsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [...CommandHandlers, ...QueryHandlers, JwtAuthGuard, ThrottlerGuard],
})
export class AuthModule {}
