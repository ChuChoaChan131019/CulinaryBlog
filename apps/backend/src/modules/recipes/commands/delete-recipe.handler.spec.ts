import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { recipes } from '../../../infrastructure/database/schema';
import { DeleteRecipeCommand } from './delete-recipe.command';
import { DeleteRecipeHandler } from './delete-recipe.handler';

describe('DeleteRecipeHandler', () => {
  const recipeId = '38cd0ac5-58f8-4b9f-9161-c311958c4eed';
  const owner = {
    id: 'b5766939-6e3d-41cb-b652-84a185d9207f',
    email: 'owner@example.com',
    role: 'Author' as const,
  };
  const admin = { ...owner, role: 'Admin' as const };
  const recipe = { id: recipeId, authorId: owner.id };
  const objectKeys = [
    'recipes/recipe-1/original.jpg',
    'recipes/recipe-1/other.png',
  ];

  function buildHandler() {
    const deleteWhere = jest.fn().mockResolvedValue([]);
    const tx = {
      select: jest.fn((_selection: Record<string, unknown>) => ({
        from: jest.fn((table: unknown) => {
          if (table === recipes) {
            return {
              where: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue([recipe]),
              })),
            };
          }
          return {
            where: jest
              .fn()
              .mockResolvedValue(
                objectKeys.map((objectKey) => ({ objectKey })),
              ),
          };
        }),
      })),
      delete: jest.fn(() => ({ where: deleteWhere })),
    };
    const db = {
      transaction: jest.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const cache = { delete: jest.fn().mockResolvedValue(undefined) };
    const imageCleanup = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const handler = new DeleteRecipeHandler(
      db as never,
      cache as never,
      imageCleanup as never,
    );

    return { handler, db, tx, cache, imageCleanup, deleteWhere };
  }

  it('hard-deletes the recipe, invalidates cache and enqueues image cleanup', async () => {
    const { handler, tx, cache, imageCleanup, deleteWhere } = buildHandler();

    await handler.execute(new DeleteRecipeCommand(recipeId, owner));

    expect(deleteWhere).toHaveBeenCalled();
    expect(cache.delete).toHaveBeenCalledWith('recipes');
    expect(imageCleanup.enqueue).toHaveBeenCalledWith({ recipeId, objectKeys });
    expect(tx.select).toHaveBeenCalledTimes(2);
  });

  it('allows Admin to delete another author’s recipe', async () => {
    const { handler, imageCleanup } = buildHandler();

    await expect(
      handler.execute(new DeleteRecipeCommand(recipeId, admin)),
    ).resolves.toBeUndefined();
    expect(imageCleanup.enqueue).toHaveBeenCalled();
  });

  it('rejects a non-owner', async () => {
    const { handler } = buildHandler();
    const otherAuthor = {
      ...owner,
      id: '9bd2d8a9-d4b1-4ad0-8b0a-3e0c7b1ad999',
    };

    await expect(
      handler.execute(new DeleteRecipeCommand(recipeId, otherAuthor)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 404 when the recipe does not exist', async () => {
    const { handler, tx } = buildHandler();
    (tx.select as jest.Mock).mockImplementationOnce(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({ limit: jest.fn().mockResolvedValue([]) })),
      })),
    }));

    await expect(
      handler.execute(new DeleteRecipeCommand(recipeId, owner)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not fail the 204 flow when enqueue fails, but logs the failure', async () => {
    const { handler, imageCleanup } = buildHandler();
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    imageCleanup.enqueue.mockRejectedValueOnce(new Error('Redis unavailable'));

    await expect(
      handler.execute(new DeleteRecipeCommand(recipeId, owner)),
    ).resolves.toBeUndefined();
    await Promise.resolve();

    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('Redis unavailable'),
    );
    loggerError.mockRestore();
  });
});
