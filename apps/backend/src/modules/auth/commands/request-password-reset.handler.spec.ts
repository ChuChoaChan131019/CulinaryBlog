import { RequestPasswordResetCommand } from './request-password-reset.command';
import { RequestPasswordResetHandler } from './request-password-reset.handler';

describe('RequestPasswordResetHandler', () => {
  const buildHandler = (userRecord?: { id: string; email: string; displayName: string }) => {
    const limit = jest.fn().mockResolvedValue(userRecord ? [userRecord] : []);
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });
    const select = jest.fn().mockReturnValue({ from });

    const values = jest.fn().mockResolvedValue({ rowCount: 1 });
    const insert = jest.fn().mockReturnValue({ values });

    const db = { select, insert };
    const config = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };
    const queue = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    };

    const handler = new RequestPasswordResetHandler(
      db as never,
      config as never,
      queue as never,
    );

    return { handler, db, queue, values };
  };

  it('không gửi email và không tạo token khi email không tồn tại', async () => {
    const { handler, db, queue } = buildHandler(undefined);

    await expect(
      handler.execute(new RequestPasswordResetCommand('nonexistent@example.com')),
    ).resolves.toBeUndefined();

    expect(db.insert).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('tạo token 30 phút và enqueue email khi email tồn tại', async () => {
    const { handler, db, queue, values } = buildHandler({
      id: 'u-1',
      email: 'user@example.com',
      displayName: 'Nguyen Van A',
    });

    await handler.execute(new RequestPasswordResetCommand('user@example.com'));

    expect(db.insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u-1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );
    expect(queue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        displayName: 'Nguyen Van A',
        resetUrl: expect.stringContaining('/reset-password?token='),
      }),
    );
  });
});
