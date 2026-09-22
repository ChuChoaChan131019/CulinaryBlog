import { ConflictException } from '@nestjs/common';
import { RegisterCommand } from './register.command';
import { RegisterHandler } from './register.handler';

describe('RegisterHandler', () => {
  const buildDb = (existingUser: unknown[]) => ({
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(existingUser),
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([
          { id: 'user-1', email: 'a@b.com', displayName: 'Người dùng A' },
        ]),
      }),
    }),
  });

  it('tạo tài khoản mới khi email chưa tồn tại', async () => {
    const db = buildDb([]);
    const handler = new RegisterHandler(db as never);

    const result = await handler.execute(
      new RegisterCommand('a@b.com', 'Password1!', 'Người dùng A'),
    );

    expect(result).toEqual({ userId: 'user-1', email: 'a@b.com', displayName: 'Người dùng A' });
    expect(db.insert).toHaveBeenCalled();
  });

  it('ném ConflictException khi email đã tồn tại', async () => {
    const db = buildDb([{ id: 'user-existing' }]);
    const handler = new RegisterHandler(db as never);

    await expect(
      handler.execute(new RegisterCommand('a@b.com', 'Password1!', 'Người dùng A')),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
