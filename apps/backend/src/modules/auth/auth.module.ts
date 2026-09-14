import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthController } from './auth.controller';
import { RegisterHandler } from './commands/register.handler';

const CommandHandlers = [RegisterHandler];

@Module({
  imports: [CqrsModule],
  controllers: [AuthController],
  providers: [...CommandHandlers],
})
export class AuthModule {}
