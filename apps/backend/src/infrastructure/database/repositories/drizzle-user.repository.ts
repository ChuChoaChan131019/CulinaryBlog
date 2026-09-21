import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { UserRepository } from '../../../application/auth/user.repository';
import type { Database } from '../database.module';
import { DATABASE_CONNECTION } from '../database.tokens';
import { users } from '../schema';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async emailExists(email: string): Promise<boolean> {
    const [user] = await this.db.select({ id: users.id }).from(users)
      .where(eq(users.email, email)).limit(1);
    return !!user;
  }

  async createAuthor(email: string, passwordHash: string, displayName: string) {
    const [created] = await this.db.insert(users)
      .values({ email, passwordHash, displayName, role: 'Author' })
      .returning({ id: users.id, email: users.email, displayName: users.displayName });
    return created;
  }

  async findActiveById(id: string) {
    const [user] = await this.db.select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(and(eq(users.id, id), eq(users.isActive, true), eq(users.isDeleted, false)))
      .limit(1);
    return user ?? null;
  }
}
