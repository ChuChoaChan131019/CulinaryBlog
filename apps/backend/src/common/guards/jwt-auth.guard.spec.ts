import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  function setup() {
    const request = { headers: { authorization: 'Bearer valid-token' }, user: undefined as unknown };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1' }) };
    const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
    const users = { findActiveById: jest.fn().mockResolvedValue({
      id: 'user-1', email: 'user@example.com', role: 'Author',
    }) };
    const guard = new JwtAuthGuard(jwt as never, config as never, users as never);
    return { request, context, jwt, users, guard };
  }

  it('attaches an active user resolved through the repository', async () => {
    const { request, context, jwt, users, guard } = setup();
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('valid-token', { secret: 'test-secret' });
    expect(users.findActiveById).toHaveBeenCalledWith('user-1');
    expect(request.user).toMatchObject({ id: 'user-1', role: 'Author' });
  });

  it('rejects a missing or inactive user', async () => {
    const { context, users, guard } = setup();
    users.findActiveById.mockResolvedValue(null);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
