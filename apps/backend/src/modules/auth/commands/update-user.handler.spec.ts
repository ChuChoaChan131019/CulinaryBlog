import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { UserRole } from '@culinary/shared';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { UpdateUserCommand } from './update-user.command';
import { UpdateUserHandler } from './update-user.handler';

describe('UpdateUserHandler', () => {
  const currentAdmin: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@culinary.local',
    role: 'Admin',
  };

  const otherUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'writer@culinary.local',
    displayName: 'Writer User',
    avatarUrl: null,
    role: 'Author' as UserRole,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  function buildDb(options?: {
    existingUser?: Partial<typeof otherUser> | null;
    updatedUser?: Partial<typeof otherUser>;
  }) {
    const existing =
      options?.existingUser === null
        ? []
        : [options?.existingUser ?? otherUser];

    const returningResult = [
      {
        ...otherUser,
        ...options?.updatedUser,
      },
    ];

    const returning = jest.fn().mockResolvedValue(returningResult);
    const updateWhere = jest.fn(() => ({ returning }));
    const updateSet = jest.fn(() => ({ where: updateWhere }));
    const update = jest.fn(() => ({ set: updateSet }));

    const limit = jest.fn().mockResolvedValue(existing);
    const selectWhere = jest.fn(() => ({ limit }));
    const from = jest.fn(() => ({ where: selectWhere }));
    const select = jest.fn(() => ({ from }));

    const db = { select, update };
    return { db, updateSet, returning };
  }

  it('cập nhật trạng thái isActive thành false (khóa tài khoản)', async () => {
    const { db, updateSet } = buildDb({
      updatedUser: { isActive: false },
    });
    const handler = new UpdateUserHandler(db as never);

    const result = await handler.execute(
      new UpdateUserCommand(otherUser.id, currentAdmin, { isActive: false }),
    );

    expect(result.isActive).toBe(false);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });

  it('cập nhật vai trò thành Admin', async () => {
    const { db, updateSet } = buildDb({
      updatedUser: { role: 'Admin' },
    });
    const handler = new UpdateUserHandler(db as never);

    const result = await handler.execute(
      new UpdateUserCommand(otherUser.id, currentAdmin, { role: 'Admin' }),
    );

    expect(result.roles).toEqual(['Admin']);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Admin' }),
    );
  });

  it('báo lỗi 404 khi không tìm thấy người dùng', async () => {
    const { db } = buildDb({ existingUser: null });
    const handler = new UpdateUserHandler(db as never);

    await expect(
      handler.execute(
        new UpdateUserCommand(
          '99999999-9999-4999-8999-999999999999',
          currentAdmin,
          { isActive: false },
        ),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ngăn chặn admin tự khóa tài khoản của chính mình', async () => {
    const { db } = buildDb({
      existingUser: { id: currentAdmin.id, role: 'Admin', isActive: true },
    });
    const handler = new UpdateUserHandler(db as never);

    await expect(
      handler.execute(
        new UpdateUserCommand(currentAdmin.id, currentAdmin, {
          isActive: false,
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ngăn chặn admin tự hạ quyền Admin của chính mình', async () => {
    const { db } = buildDb({
      existingUser: { id: currentAdmin.id, role: 'Admin', isActive: true },
    });
    const handler = new UpdateUserHandler(db as never);

    await expect(
      handler.execute(
        new UpdateUserCommand(currentAdmin.id, currentAdmin, {
          role: 'Author',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
