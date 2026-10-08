import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WelcomeEmailQueue } from '../../../infrastructure/jobs/welcome-email.queue';
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
    const welcomeEmailQueue = { enqueue: jest.fn().mockResolvedValue(undefined) } as unknown as WelcomeEmailQueue;
    const config = { get: jest.fn().mockReturnValue('https://example.test') } as unknown as ConfigService;
    const handler = new RegisterHandler(db as never, config, welcomeEmailQueue);

    const result = await handler.execute(
      new RegisterCommand('a@b.com', 'Password1!', 'Người dùng A'),
    );

    expect(result).toEqual({ userId: 'user-1', email: 'a@b.com', displayName: 'Người dùng A' });
    expect(db.insert).toHaveBeenCalled();
    expect(welcomeEmailQueue.enqueue).toHaveBeenCalledWith({
      email: 'a@b.com',
      displayName: 'Người dùng A',
      appUrl: 'https://example.test',
    });
  });

  it('ném ConflictException khi email đã tồn tại', async () => {
    const db = buildDb([{ id: 'user-existing' }]);
    const welcomeEmailQueue = { enqueue: jest.fn() } as unknown as WelcomeEmailQueue;
    const config = { get: jest.fn() } as unknown as ConfigService;
    const handler = new RegisterHandler(db as never, config, welcomeEmailQueue);

    await expect(
      handler.execute(new RegisterCommand('a@b.com', 'Password1!', 'Người dùng A')),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.insert).not.toHaveBeenCalled();
    expect(welcomeEmailQueue.enqueue).not.toHaveBeenCalled();
  });

  it('giữ user đã tạo nếu enqueue email thất bại', async () => {
    const db = buildDb([]);
    const welcomeEmailQueue = {
      enqueue: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
    } as unknown as WelcomeEmailQueue;
    const config = { get: jest.fn().mockReturnValue('https://example.test') } as unknown as ConfigService;
    const handler = new RegisterHandler(db as never, config, welcomeEmailQueue);

    await expect(
      handler.execute(new RegisterCommand('a@b.com', 'Password1!', 'Người dùng A')),
    ).resolves.toEqual({ userId: 'user-1', email: 'a@b.com', displayName: 'Người dùng A' });
  });
});
