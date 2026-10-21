import { describe, expect, it, vi } from 'vitest';
import { GetUsersHandler } from './get-users.handler';
import { GetUsersQuery } from './get-users.query';

describe('GetUsersHandler', () => {
  it('chỉ trả về projection an toàn, không có passwordHash hoặc token', async () => {
    const user = {
      id: 'ab8d6106-0351-4a96-8635-63d6eb27fdb1',
      email: 'admin@example.com',
      displayName: 'Admin',
      avatarUrl: null,
      role: 'Admin' as const,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: 'must-never-leave-database',
      refreshToken: 'must-never-leave-database',
    };
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ totalCount: 1 }]) }) })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ orderBy: () => ({ limit: () => ({ offset: () => Promise.resolve([user]) }) }) }),
          }),
        }),
    };
    const handler = new GetUsersHandler(db as never);

    const result = await handler.execute(new GetUsersQuery({ page: 1, pageSize: 20, sort: '-createdAt' }));

    expect(result.items).toEqual([{
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: null,
      roles: ['Admin'],
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    }]);
    expect(result.items[0]).not.toHaveProperty('passwordHash');
    expect(result.items[0]).not.toHaveProperty('refreshToken');
  });
});
