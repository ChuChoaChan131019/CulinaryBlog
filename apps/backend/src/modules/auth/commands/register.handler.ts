import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import { users } from '../../../infrastructure/database/schema';
import { RegisterCommand } from './register.command';

export interface RegisterResult {
  userId: string;
  email: string;
  displayName: string;
}

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand, RegisterResult> {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const { email, password, displayName } = command;

    const existing = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      throw new ConflictException({
        type: 'about:blank',
        title: 'Email đã tồn tại',
        status: 409,
        detail: 'AUTH_EMAIL_EXISTS',
      });
    }

    const passwordHash = await argon2.hash(password);
    const [created] = await this.db
      .insert(users)
      .values({ email, passwordHash, displayName, role: 'Author' })
      .returning({ id: users.id, email: users.email, displayName: users.displayName });

    // ponytail: FR-JOB-001 (welcome email qua BullMQ) chưa tồn tại — sẽ enqueue ở sub-issue riêng (#42),
    // upgrade: inject queue ở đây khi jobs module sẵn sàng.

    return { userId: created.id, email: created.email, displayName: created.displayName };
  }
}
