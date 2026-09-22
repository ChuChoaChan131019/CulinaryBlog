import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  const request = { headers: { authorization: 'Bearer expired-token' }, user: undefined as unknown };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;

  it('allows guest access when a bearer token has expired', async () => {
    const jwt = { verifyAsync: jest.fn().mockRejectedValue(new Error('jwt expired')) };
    const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
    const users = { findActiveById: jest.fn() };
    const jwtAuthGuard = new JwtAuthGuard(jwt as never, config as never, users as never);
    const guard = new OptionalJwtAuthGuard(jwtAuthGuard);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(users.findActiveById).not.toHaveBeenCalled();
  });

  it('does not swallow unrelated guard errors', async () => {
    const failure = new Error('unexpected failure');
    const jwtAuthGuard = { canActivate: jest.fn().mockRejectedValue(failure) };
    const guard = new OptionalJwtAuthGuard(jwtAuthGuard as unknown as JwtAuthGuard);

    await expect(guard.canActivate(context)).rejects.toBe(failure);
  });
});
