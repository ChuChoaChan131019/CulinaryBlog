import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CategoriesController } from './categories.controller';
import { DeleteCategoryCommand } from './commands/delete-category.command';

describe('CategoriesController delete', () => {
  it('dispatches DeleteCategoryCommand for the current Admin', async () => {
    const commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = new CategoriesController(
      commandBus as unknown as CommandBus,
      {} as QueryBus,
    );
    const user = {
      id: 'b5766939-6e3d-41cb-b652-84a185d9207f',
      email: 'admin@example.com',
      role: 'Admin' as const,
    };
    const categoryId = 'f8050eb8-9d4b-4ce6-a94f-68b590119185';

    await expect(controller.delete(categoryId, user)).resolves.toBeUndefined();
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(DeleteCategoryCommand),
    );
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      categoryId,
      user,
    });
  });
});
