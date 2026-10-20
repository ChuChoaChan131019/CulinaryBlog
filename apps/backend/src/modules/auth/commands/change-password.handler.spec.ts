import * as argon2 from 'argon2';
import { ChangePasswordCommand } from './change-password.command';
import { ChangePasswordHandler } from './change-password.handler';

jest.mock('argon2');

describe('ChangePasswordHandler', () => {
  const mockArgon = argon2 as jest.Mocked<typeof argon2>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildDb = (userRecord?: { id: string; passwordHash: string | null }) => {
    const limit = jest.fn().mockResolvedValue(userRecord ? [userRecord] : []);
    const whereSelect = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where: whereSelect });
    const select = jest.fn().mockReturnValue({ from });

    const txWhere = jest.fn().mockResolvedValue({ rowCount: 1 });
    const txSet = jest.fn().mockReturnValue({ where: txWhere });
    const txUpdate = jest.fn().mockReturnValue({ set: txSet });

    const tx = { update: txUpdate };
    const transaction = jest.fn(async (cb: (trx: typeof tx) => unknown) => cb(tx));

    return {
      db: { select, transaction },
      txUpdate,
      txSet,
      txWhere,
    };
  };

  it('từ chối 401 khi user không tồn tại', async () => {
    const { db } = buildDb(undefined);
    const handler = new ChangePasswordHandler(db as never);

    await expect(
      handler.execute(new ChangePasswordCommand('u-1', 'OldPass@123', 'NewPass@123')),
    ).rejects.toMatchObject({
      status: 401,
      response: expect.objectContaining({ detail: 'AUTH_INVALID_CREDENTIALS' }),
    });
  });

  it('từ chối 422 khi user đăng nhập Google chưa có passwordHash', async () => {
    const { db } = buildDb({ id: 'u-1', passwordHash: null });
    const handler = new ChangePasswordHandler(db as never);

    await expect(
      handler.execute(new ChangePasswordCommand('u-1', 'OldPass@123', 'NewPass@123')),
    ).rejects.toMatchObject({
      status: 422,
      response: expect.objectContaining({ detail: 'AUTH_PASSWORD_NOT_SET' }),
    });
  });

  it('từ chối 401 khi mật khẩu hiện tại không khớp', async () => {
    const { db } = buildDb({ id: 'u-1', passwordHash: 'hashed-old' });
    mockArgon.verify.mockResolvedValueOnce(false);
    const handler = new ChangePasswordHandler(db as never);

    await expect(
      handler.execute(new ChangePasswordCommand('u-1', 'WrongPass@123', 'NewPass@123')),
    ).rejects.toMatchObject({
      status: 401,
      response: expect.objectContaining({ detail: 'AUTH_INVALID_CREDENTIALS' }),
    });
  });

  it('cập nhật hash mới và revoke toàn bộ refresh token khi đúng mật khẩu', async () => {
    const { db, txSet } = buildDb({ id: 'u-1', passwordHash: 'hashed-old' });
    mockArgon.verify.mockResolvedValueOnce(true);
    mockArgon.hash.mockResolvedValueOnce('hashed-new');
    const handler = new ChangePasswordHandler(db as never);

    await handler.execute(new ChangePasswordCommand('u-1', 'OldPass@123', 'NewPass@123'));

    expect(db.transaction).toHaveBeenCalled();
    expect(txSet).toHaveBeenCalledWith({ passwordHash: 'hashed-new' });
    expect(txSet).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
  });
});
