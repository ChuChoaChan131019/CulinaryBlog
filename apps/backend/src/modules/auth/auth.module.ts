import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PASSWORD_HASHER } from '../../application/auth/password-hasher.port';
import { Argon2PasswordHasher } from '../../infrastructure/auth/argon2-password-hasher';
import { AuthController } from './auth.controller';
import { RegisterHandler } from './commands/register.handler';

const CommandHandlers = [RegisterHandler];

@Module({
  imports: [CqrsModule],
  controllers: [AuthController],
  providers: [
    ...CommandHandlers,
    Argon2PasswordHasher,
    { provide: PASSWORD_HASHER, useExisting: Argon2PasswordHasher },
  ],
})
export class AuthModule {}
