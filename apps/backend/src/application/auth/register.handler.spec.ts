import { ConflictException } from '@nestjs/common';
import { RegisterCommand } from './register.command';
import { RegisterHandler } from './register.handler';

describe('RegisterHandler', () => {
  const command = new RegisterCommand('a@b.com', 'Password1!', 'Người dùng A');

  function setup() {
    const users = {
      emailExists: jest.fn().mockResolvedValue(false),
      createAuthor: jest.fn().mockResolvedValue({
        id: 'user-1', email: command.email, displayName: command.displayName,
      }),
    };
    const hasher = { hash: jest.fn().mockResolvedValue('argon2-hash') };
    return { users, hasher, handler: new RegisterHandler(users as never, hasher as never) };
  }

  it('hashes the password and creates an Author through the repository', async () => {
    const { users, hasher, handler } = setup();
    await expect(handler.execute(command)).resolves.toEqual({
      userId: 'user-1', email: command.email, displayName: command.displayName,
    });
    expect(hasher.hash).toHaveBeenCalledWith(command.password);
    expect(users.createAuthor).toHaveBeenCalledWith(command.email, 'argon2-hash', command.displayName);
  });

  it('rejects an existing email before hashing or writing', async () => {
    const { users, hasher, handler } = setup();
    users.emailExists.mockResolvedValue(true);
    await expect(handler.execute(command)).rejects.toBeInstanceOf(ConflictException);
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.createAuthor).not.toHaveBeenCalled();
  });
});
