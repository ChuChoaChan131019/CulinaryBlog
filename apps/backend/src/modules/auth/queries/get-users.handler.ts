import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { PagedResult, UserListItemDto, UserListSort } from '@culinary/shared';
import { SQL, and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import { users } from '../../../infrastructure/database/schema';
import { GetUsersQuery } from './get-users.query';

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery, PagedResult<UserListItemDto>> {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async execute({ params }: GetUsersQuery): Promise<PagedResult<UserListItemDto>> {
    const where = and(...this.conditions(params.role, params.q));
    const [{ totalCount }] = await this.db.select({ totalCount: count() }).from(users).where(where);
    const rows = await this.db
      .select({ id: users.id, email: users.email, displayName: users.displayName, avatarUrl: users.avatarUrl, role: users.role, isActive: users.isActive, createdAt: users.createdAt })
      .from(users)
      .where(where)
      .orderBy(this.order(params.sort), asc(users.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);
    const totalPages = Math.ceil(totalCount / params.pageSize);
    return {
      items: rows.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        roles: [user.role],
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      })),
      totalCount, page: params.page, pageSize: params.pageSize, totalPages,
      hasNextPage: params.page < totalPages, hasPreviousPage: params.page > 1,
    };
  }

  private conditions(role?: 'Author' | 'Admin', q?: string): SQL[] {
    const conditions: SQL[] = [eq(users.isDeleted, false)];
    if (role) conditions.push(eq(users.role, role));
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(or(ilike(users.email, pattern), ilike(users.displayName, pattern))!);
    }
    return conditions;
  }

  private order(sort: UserListSort): SQL {
    const descending = sort.startsWith('-');
    const field = descending ? sort.slice(1) : sort;
    const column = field === 'email' ? users.email : field === 'displayName' ? users.displayName : users.createdAt;
    return descending ? desc(column) : asc(column);
  }
}
