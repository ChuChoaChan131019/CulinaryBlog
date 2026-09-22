import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  const request = { headers: { authorization: 'Bearer expired-token' }, user: undefined as unknown };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;

  beforeEach(() => {
    request.headers.authorization = 'Bearer expired-token';
    request.user = undefined;
  });

  it('allows a request without a token as a guest', async () => {
    request.headers.authorization = '';
    const jwtAuthGuard = { canActivate: jest.fn() };
    const guard = new OptionalJwtAuthGuard(jwtAuthGuard as unknown as JwtAuthGuard);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
  });

  it('allows guest access when a bearer token has expired', async () => {
    const jwt = { verifyAsync: jest.fn().mockRejectedValue(new Error('jwt expired')) };
    const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
    const db = { select: jest.fn() };
    const jwtAuthGuard = new JwtAuthGuard(jwt as never, config as never, db as never);
    const guard = new OptionalJwtAuthGuard(jwtAuthGuard);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(db.select).not.toHaveBeenCalled();
  });

  it('does not swallow unrelated guard errors', async () => {
    const failure = new Error('unexpected failure');
    const jwtAuthGuard = { canActivate: jest.fn().mockRejectedValue(failure) };
    const guard = new OptionalJwtAuthGuard(jwtAuthGuard as unknown as JwtAuthGuard);

    await expect(guard.canActivate(context)).rejects.toBe(failure);
  });

  it('propagates a database failure after successful token verification', async () => {
    const failure = new Error('database unavailable');
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1' }) };
    const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(failure),
          }),
        }),
      }),
    };
    const jwtAuthGuard = new JwtAuthGuard(jwt as never, config as never, db as never);
    const guard = new OptionalJwtAuthGuard(jwtAuthGuard);

    await expect(guard.canActivate(context)).rejects.toBe(failure);
    expect(db.select).toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('keeps an authenticated admin identity after a successful lookup', async () => {
    const admin = { id: 'admin-1', email: 'admin@example.com', role: 'Admin' };
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: admin.id }) };
    const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([admin]),
          }),
        }),
      }),
    };
    const jwtAuthGuard = new JwtAuthGuard(jwt as never, config as never, db as never);
    const guard = new OptionalJwtAuthGuard(jwtAuthGuard);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(admin);
  });

  it('allows a valid token with no active user as a guest', async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'deleted-user' }) };
    const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };
    const jwtAuthGuard = new JwtAuthGuard(jwt as never, config as never, db as never);
    const guard = new OptionalJwtAuthGuard(jwtAuthGuard);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });
});
