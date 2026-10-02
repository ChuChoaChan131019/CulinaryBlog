import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PgDialect } from 'drizzle-orm/pg-core';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { RecipeStatusService } from './recipe-status.service';

describe('RecipeStatusService', () => {
  const recipeId = '38cd0ac5-58f8-4b9f-9161-c311958c4eed';
  const ownerId = 'b5766939-6e3d-41cb-b652-84a185d9207f';
  const user = {
    id: ownerId,
    email: 'trang@example.com',
    role: 'Author' as const,
  };
  const baseRecipe = {
    id: recipeId,
    title: 'Bánh mì thịt nướng',
    slug: 'banh-mi-thit-nuong',
    description: 'Bánh mì Việt Nam',
    instructions: 'Nướng thịt',
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    difficulty: 'Medium' as const,
    status: 'Draft' as const,
    categoryId: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
    authorId: ownerId,
    publishedAt: null,
    nutritionCalories: null,
    nutritionProtein: null,
    nutritionCarbohydrates: null,
    nutritionFat: null,
    nutritionFiber: null,
    nutritionSodium: null,
    rowVersion: 1,
    createdAt: new Date('2026-09-20T10:00:00.000Z'),
    updatedAt: null,
    isDeleted: false,
  };
  const steps = [
    {
      id: 'd56c6dd0-d95a-488a-bb25-dbd616d7994b',
      stepNumber: 1,
      title: 'Nướng thịt',
      description: 'Nướng chín vàng',
      timerMinutes: 15,
      imageUrl: null,
    },
  ];
  const ingredients: never[] = [];
  type RecipeRow = Omit<
    typeof baseRecipe,
    'status' | 'publishedAt' | 'updatedAt'
  > & {
    status: 'Draft' | 'Published' | 'Archived';
    publishedAt: Date | null;
    updatedAt: Date | null;
  };

  function setup(
    selectResults: unknown[][],
    updated: RecipeRow | null = baseRecipe,
  ) {
    const results = [...selectResults];
    const select = jest.fn().mockImplementation(() => ({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockImplementation(() => results.shift() ?? []),
          orderBy: jest.fn().mockImplementation(() => results.shift() ?? []),
        }),
      }),
    }));
    const returning = jest.fn().mockResolvedValue(updated ? [updated] : []);
    const updateWhere = jest.fn().mockReturnValue({ returning });
    const updateSet = jest.fn().mockReturnValue({
      where: updateWhere,
    });
    const tx = {
      select,
      update: jest.fn().mockReturnValue({ set: updateSet }),
    };
    const db = {
      transaction: jest.fn((callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const cache = {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;

    return {
      service: new RecipeStatusService(db as never, cache),
      tx,
      updateSet,
      updateWhere,
      cache,
    };
  }

  it('publish Draft có step, cập nhật trạng thái và xóa cache', async () => {
    const published = {
      ...baseRecipe,
      status: 'Published' as const,
      publishedAt: new Date(),
      updatedAt: new Date(),
      rowVersion: 2,
    };
    const { service, updateSet, cache } = setup(
      [[baseRecipe], [{ id: steps[0].id }], steps, ingredients],
      published,
    );

    await expect(service.publish(recipeId, user)).resolves.toMatchObject({
      status: 'Published',
      rowVersion: 2,
      steps,
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Published',
        publishedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
    expect(cache.delete).toHaveBeenCalledWith('recipes');
  });

  it('từ chối publish khi chưa có step', async () => {
    const { service, tx, cache } = setup([[baseRecipe], []]);
    const promise = service.publish(recipeId, user);

    await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({
        type: 'RECIPE_PUBLISH_INCOMPLETE',
        status: 422,
      }),
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('unpublish Published về Draft và giữ nguyên publishedAt', async () => {
    const publishedAt = new Date('2026-09-01T10:00:00.000Z');
    const existing = {
      ...baseRecipe,
      status: 'Published' as const,
      publishedAt,
    };
    const updated = {
      ...baseRecipe,
      publishedAt,
      updatedAt: new Date(),
      rowVersion: 2,
    };
    const { service, updateSet } = setup(
      [[existing], steps, ingredients],
      updated,
    );

    await expect(service.unpublish(recipeId, user)).resolves.toMatchObject({
      status: 'Draft',
      rowVersion: 2,
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Draft' }),
    );
    expect(updateSet.mock.calls[0][0]).not.toHaveProperty('publishedAt');
  });

  it('publish lại giữ nguyên ngày xuất bản đầu tiên', async () => {
    const publishedAt = new Date('2026-09-01T10:00:00.000Z');
    const existing = { ...baseRecipe, publishedAt };
    const published = {
      ...existing,
      status: 'Published' as const,
      updatedAt: new Date(),
      rowVersion: 2,
    };
    const { service, updateSet } = setup(
      [[existing], [{ id: steps[0].id }], steps, ingredients],
      published,
    );

    await expect(service.publish(recipeId, user)).resolves.toMatchObject({
      status: 'Published',
      rowVersion: 2,
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ publishedAt }),
    );
  });

  it.each(['Draft', 'Published'] as const)(
    'archive recipe %s, giữ dữ liệu và xóa cache',
    async (status) => {
      const publishedAt =
        status === 'Published'
          ? new Date('2026-09-01T10:00:00.000Z')
          : null;
      const existing = { ...baseRecipe, status, publishedAt };
      const archived = {
        ...existing,
        status: 'Archived' as const,
        updatedAt: new Date(),
        rowVersion: 2,
      };
      const { service, updateSet, cache } = setup(
        [[existing], steps, ingredients],
        archived,
      );

      await expect(service.archive(recipeId, user)).resolves.toMatchObject({
        status: 'Archived',
        rowVersion: 2,
      });
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Archived',
          updatedAt: expect.any(Date),
        }),
      );
      expect(updateSet.mock.calls[0][0]).not.toHaveProperty('publishedAt');
      expect(cache.delete).toHaveBeenCalledWith('recipes');
    },
  );

  it('chỉ update khi status vẫn khớp trạng thái đã đọc', async () => {
    const published = {
      ...baseRecipe,
      status: 'Published' as const,
      publishedAt: new Date(),
      updatedAt: new Date(),
      rowVersion: 2,
    };
    const { service, updateWhere } = setup(
      [[baseRecipe], [{ id: steps[0].id }], steps, ingredients],
      published,
    );

    await service.publish(recipeId, user);

    const compiledWhere = new PgDialect().sqlToQuery(
      updateWhere.mock.calls[0][0],
    );
    expect(compiledWhere.params).toEqual([recipeId, false, 'Draft']);
  });

  it('coi request thua race là no-op khi recipe đã ở target status', async () => {
    const publishedAt = new Date('2026-09-01T10:00:00.000Z');
    const current = {
      ...baseRecipe,
      status: 'Published' as const,
      publishedAt,
      updatedAt: new Date(),
      rowVersion: 2,
    };
    const { service, cache } = setup(
      [
        [baseRecipe],
        [{ id: steps[0].id }],
        [current],
        steps,
        ingredients,
      ],
      null,
    );

    await expect(service.publish(recipeId, user)).resolves.toMatchObject({
      status: 'Published',
      rowVersion: 2,
    });
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('coi archive thua race là no-op khi recipe đã được lưu trữ', async () => {
    const archived = {
      ...baseRecipe,
      status: 'Archived' as const,
      updatedAt: new Date(),
      rowVersion: 2,
    };
    const { service, cache } = setup(
      [[baseRecipe], [archived], steps, ingredients],
      null,
    );

    await expect(service.archive(recipeId, user)).resolves.toMatchObject({
      status: 'Archived',
      rowVersion: 2,
    });
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('trả 409 khi recipe đổi trạng thái khác trong lúc update', async () => {
    const { service, cache } = setup(
      [[baseRecipe], [{ id: steps[0].id }], [baseRecipe]],
      null,
    );
    const promise = service.publish(recipeId, user);

    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({
        type: 'RECIPE_CONCURRENCY_CONFLICT',
        status: 409,
      }),
    });
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['publish', 'Published' as const],
    ['unpublish', 'Draft' as const],
    ['archive', 'Archived' as const],
  ])('idempotent khi %s recipe ở đúng trạng thái', async (action, status) => {
    const existing = { ...baseRecipe, status };
    const { service, tx, cache } = setup([[existing], steps, ingredients]);

    const result =
      action === 'publish'
        ? service.publish(recipeId, user)
        : action === 'unpublish'
          ? service.unpublish(recipeId, user)
          : service.archive(recipeId, user);

    await expect(result).resolves.toMatchObject({ status, rowVersion: 1 });
    expect(tx.update).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['publish', 'Published' as const],
    ['archive', 'Archived' as const],
  ])('cho phép Admin %s recipe của tác giả khác', async (action, status) => {
    const updated = {
      ...baseRecipe,
      status,
      ...(status === 'Published' && { publishedAt: new Date() }),
    };
    const { service } = setup(
      [
        [baseRecipe],
        ...(action === 'publish' ? [[{ id: steps[0].id }]] : []),
        steps,
        ingredients,
      ],
      updated,
    );

    const admin = {
      id: 'admin-id',
      email: 'admin@example.com',
      role: 'Admin' as const,
    };
    const result =
      action === 'publish'
        ? service.publish(recipeId, admin)
        : service.archive(recipeId, admin);

    await expect(result).resolves.toMatchObject({ status });
  });

  it.each([
    {
      name: 'recipe không tồn tại',
      results: [[]],
      user,
      exception: NotFoundException,
      type: 'RECIPE_NOT_FOUND',
    },
    {
      name: 'Author không sở hữu recipe',
      results: [[baseRecipe]],
      user: { ...user, id: 'author-khac' },
      exception: ForbiddenException,
      type: 'RECIPE_FORBIDDEN',
    },
    {
      name: 'recipe đã Archived',
      results: [[{ ...baseRecipe, status: 'Archived' }]],
      user,
      exception: UnprocessableEntityException,
      type: 'RECIPE_INVALID_STATUS_TRANSITION',
    },
  ])('trả lỗi đúng khi $name', async (scenario) => {
    const { service, tx, cache } = setup(scenario.results as unknown[][]);
    const promise = service.publish(recipeId, scenario.user as typeof user);

    await expect(promise).rejects.toBeInstanceOf(scenario.exception);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({ type: scenario.type }),
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
