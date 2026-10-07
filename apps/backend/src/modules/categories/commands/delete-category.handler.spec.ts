import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PgDialect } from 'drizzle-orm/pg-core';
import { categories, recipes } from '../../../infrastructure/database/schema';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { DeleteCategoryCommand } from './delete-category.command';
import { DeleteCategoryHandler } from './delete-category.handler';

describe('DeleteCategoryHandler', () => {
  const categoryId = 'f8050eb8-9d4b-4ce6-a94f-68b590119185';
  const admin = {
    id: 'b5766939-6e3d-41cb-b652-84a185d9207f',
    email: 'admin@example.com',
    role: 'Admin' as const,
  };
  const author = { ...admin, role: 'Author' as const };

  function buildHandler(options?: {
    category?: { id: string } | null;
    recipeCount?: number | string;
    deleted?: { id: string } | null;
  }) {
    const category =
      options?.category === undefined ? { id: categoryId } : options.category;
    const recipeCount = options?.recipeCount ?? 0;
    const deleted =
      options?.deleted === undefined ? { id: categoryId } : options.deleted;

    const limit = jest.fn().mockResolvedValue(category ? [category] : []);
    const categoryFor = jest.fn(() => ({ limit }));
    const categoryWhere = jest.fn(() => ({ for: categoryFor }));
    const categoryFrom = jest.fn((table: unknown) => {
      if (table !== categories) throw new Error('Unexpected category table');
      return { where: categoryWhere };
    });
    const recipeWhere = jest
      .fn()
      .mockResolvedValue([{ count: recipeCount }]);
    const recipeFrom = jest.fn((table: unknown) => {
      if (table !== recipes) throw new Error('Unexpected recipe table');
      return { where: recipeWhere };
    });
    const select = jest.fn((selection: Record<string, unknown>) => ({
      from: selection.id === categories.id ? categoryFrom : recipeFrom,
    }));

    const returning = jest
      .fn()
      .mockResolvedValue(deleted ? [deleted] : []);
    const updateWhere = jest.fn(() => ({ returning }));
    const updateSet = jest.fn(() => ({ where: updateWhere }));
    const tx = {
      select,
      update: jest.fn(() => ({ set: updateSet })),
    };
    const db = {
      transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const cache = {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;

    return {
      handler: new DeleteCategoryHandler(db as never, cache),
      db,
      tx,
      cache,
      updateSet,
      categoryFor,
      recipeWhere,
    };
  }

  it('soft-deletes an empty category and invalidates the category cache', async () => {
    const { handler, cache, updateSet, categoryFor } = buildHandler();

    await expect(
      handler.execute(new DeleteCategoryCommand(categoryId, admin)),
    ).resolves.toBeUndefined();

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ isDeleted: true, updatedAt: expect.any(Date) }),
    );
    expect(categoryFor).toHaveBeenCalledWith('update');
    expect(cache.delete).toHaveBeenCalledWith('categories:all');
  });

  it.each([1, '3'])('returns conflict when %s active recipes remain', async (count) => {
    const { handler, cache, tx } = buildHandler({ recipeCount: count });

    const promise = handler.execute(
      new DeleteCategoryCommand(categoryId, admin),
    );

    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({
        type: 'CATEGORY_DELETE_HAS_RECIPES',
        status: 409,
        detail: `Danh mục còn chứa ${Number(count)} công thức.`,
      }),
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('counts only active recipes before attempting the soft delete', async () => {
    const { handler, recipeWhere } = buildHandler();

    await handler.execute(new DeleteCategoryCommand(categoryId, admin));

    const compiled = new PgDialect().sqlToQuery(recipeWhere.mock.calls[0][0]);
    expect(compiled.params).toEqual([categoryId, false]);
  });

  it('returns not found for a missing or already deleted category', async () => {
    const { handler, cache } = buildHandler({ category: null });

    await expect(
      handler.execute(new DeleteCategoryCommand(categoryId, admin)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('rejects non-admin commands before opening a transaction', async () => {
    const { handler, db } = buildHandler();

    await expect(
      handler.execute(new DeleteCategoryCommand(categoryId, author)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('does not invalidate cache when the transaction fails', async () => {
    const { handler, db, cache } = buildHandler();
    (db.transaction as jest.Mock).mockRejectedValueOnce(
      new Error('database unavailable'),
    );

    await expect(
      handler.execute(new DeleteCategoryCommand(categoryId, admin)),
    ).rejects.toThrow('database unavailable');
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
