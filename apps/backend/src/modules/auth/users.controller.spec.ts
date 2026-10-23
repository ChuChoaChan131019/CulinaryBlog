import { UsersController } from './users.controller';
import { GetUsersQuery } from './queries/get-users.query';
import { UpdateUserCommand } from './commands/update-user.command';

describe('UsersController', () => {
  it('gọi QueryBus khi list users', async () => {
    const queryBus = { execute: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }) };
    const commandBus = { execute: jest.fn() };
    const controller = new UsersController(commandBus as never, queryBus as never);

    const query = { page: 1, pageSize: 20, sort: '-createdAt' as const };
    await controller.list(query);

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetUsersQuery));
  });

  it('gọi CommandBus khi update user', async () => {
    const queryBus = { execute: jest.fn() };
    const commandBus = { execute: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    const controller = new UsersController(commandBus as never, queryBus as never);

    const currentUser = { id: 'admin-1', email: 'admin@test.com', role: 'Admin' as const };
    await controller.update('user-1', currentUser, { isActive: false });

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateUserCommand));
  });
});
