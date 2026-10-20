import * as argon2 from 'argon2';
import { ResetPasswordCommand } from './reset-password.command';
import { ResetPasswordHandler } from './reset-password.handler';

jest.mock('argon2');

describe('ResetPasswordHandler', () => {
  const mockArgon = argon2 as jest.Mocked<typeof argon2>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildHandler = (tokenRecord?: {
    id: string;
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
    isDeleted: boolean;
  }) => {
    const limit = jest.fn().mockResolvedValue(tokenRecord ? [tokenRecord] : []);
    const whereSelect = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where: whereSelect });
    const select = jest.fn().mockReturnValue({ from });

    const txWhere = jest.fn().mockResolvedValue({ rowCount: 1 });
    const txSet = jest.fn().mockReturnValue({ where: txWhere });
    const txUpdate = jest.fn().mockReturnValue({ set: txSet });

    const tx = { update: txUpdate };
    const transaction = jest.fn(async (cb: (trx: typeof tx) => unknown) => cb(tx));

    const db = { select, transaction };
    const handler = new ResetPasswordHandler(db as never);

    return { handler, db, txUpdate, txSet };
  };

  it('từ chối 400 khi token không tồn tại', async () => {
    const { handler } = buildHandler(undefined);

    await expect(
      handler.execute(new ResetPasswordCommand('invalid-token', 'NewPass@123')),
    ).rejects.toMatchObject({
      status: 400,
      response: expect.objectContaining({ detail: 'AUTH_RESET_TOKEN_INVALID' }),
    });
  });

  it('từ chối 400 khi token đã được sử dụng', async () => {
    const { handler } = buildHandler({
      id: 't-1',
      userId: 'u-1',
      expiresAt: new Date(Date.now() + 100000),
      usedAt: new Date(),
      isDeleted: false,
    });

    await expect(
      handler.execute(new ResetPasswordCommand('used-token', 'NewPass@123')),
    ).rejects.toMatchObject({
      status: 400,
      response: expect.objectContaining({ detail: 'AUTH_RESET_TOKEN_INVALID' }),
    });
  });

  it('từ chối 400 khi token đã hết hạn', async () => {
    const { handler } = buildHandler({
      id: 't-1',
      userId: 'u-1',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      isDeleted: false,
    });

    await expect(
      handler.execute(new ResetPasswordCommand('expired-token', 'NewPass@123')),
    ).rejects.toMatchObject({
      status: 400,
      response: expect.objectContaining({ detail: 'AUTH_RESET_TOKEN_INVALID' }),
    });
  });

  it('cập nhật password mới, đánh dấu usedAt và revoke refresh token khi token hợp lệ', async () => {
    const { handler, db, txSet } = buildHandler({
      id: 't-1',
      userId: 'u-1',
      expiresAt: new Date(Date.now() + 100000),
      usedAt: null,
      isDeleted: false,
    });
    mockArgon.hash.mockResolvedValueOnce('hashed-new');

    await handler.execute(new ResetPasswordCommand('valid-token', 'NewPass@123'));

    expect(db.transaction).toHaveBeenCalled();
    expect(txSet).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed-new' }),
    );
    expect(txSet).toHaveBeenCalledWith({ usedAt: expect.any(Date) });
    expect(txSet).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
  });
});
