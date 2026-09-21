import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PASSWORD_HASHER, PasswordHasher } from './password-hasher.port';
import { RegisterCommand } from './register.command';
import { USER_REPOSITORY, UserRepository } from './user.repository';

export interface RegisterResult {
  userId: string;
  email: string;
  displayName: string;
}

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand, RegisterResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const { email, password, displayName } = command;
    if (await this.users.emailExists(email)) {
      throw new ConflictException({
        type: 'about:blank', title: 'Email đã tồn tại', status: 409, detail: 'AUTH_EMAIL_EXISTS',
      });
    }
    const passwordHash = await this.hasher.hash(password);
    const created = await this.users.createAuthor(email, passwordHash, displayName);
    return { userId: created.id, email: created.email, displayName: created.displayName };
  }
}
