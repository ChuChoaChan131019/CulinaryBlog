import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import { users } from '../../../infrastructure/database/schema';
import { WelcomeEmailQueue } from '../../../infrastructure/jobs/welcome-email.queue';
import { authEmailExists } from '../auth.exceptions';
import { RegisterCommand } from './register.command';

export interface RegisterResult {
  userId: string;
  email: string;
  displayName: string;
}

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand, RegisterResult> {
  private readonly logger = new Logger(RegisterHandler.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(WelcomeEmailQueue) private readonly welcomeEmailQueue: WelcomeEmailQueue,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const { email, password, displayName } = command;

    const existing = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      throw authEmailExists();
    }

    const passwordHash = await argon2.hash(password);
    const [created] = await this.db
      .insert(users)
      .values({ email, passwordHash, displayName, role: 'Author' })
      .returning({ id: users.id, email: users.email, displayName: users.displayName });

    try {
      await this.welcomeEmailQueue.enqueue({
        email: created.email,
        displayName: created.displayName,
        appUrl: this.config.get<string>('AUTH_URL', 'http://localhost:3000'),
      });
    } catch (error) {
      this.logger.error(
        `Failed to enqueue welcome email for ${created.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { userId: created.id, email: created.email, displayName: created.displayName };
  }
}
