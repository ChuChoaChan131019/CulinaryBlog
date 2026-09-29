import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
    updated: RecipeRow = baseRecipe,
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
    const returning = jest.fn().mockResolvedValue([updated]);
    const updateSet = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ returning }),
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

  it('unpublish Published về Draft và xóa publishedAt', async () => {
    const existing = {
      ...baseRecipe,
      status: 'Published' as const,
      publishedAt: new Date(),
    };
    const updated = { ...baseRecipe, updatedAt: new Date(), rowVersion: 2 };
    const { service, updateSet } = setup(
      [[existing], steps, ingredients],
      updated,
    );

    await expect(service.unpublish(recipeId, user)).resolves.toMatchObject({
      status: 'Draft',
      rowVersion: 2,
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Draft', publishedAt: null }),
    );
  });

  it.each([
    ['publish', 'Published' as const],
    ['unpublish', 'Draft' as const],
  ])('idempotent khi %s recipe ở đúng trạng thái', async (action, status) => {
    const existing = { ...baseRecipe, status };
    const { service, tx, cache } = setup([[existing], steps, ingredients]);

    const result =
      action === 'publish'
        ? service.publish(recipeId, user)
        : service.unpublish(recipeId, user);

    await expect(result).resolves.toMatchObject({ status, rowVersion: 1 });
    expect(tx.update).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('cho phép Admin thay đổi recipe của tác giả khác', async () => {
    const published = {
      ...baseRecipe,
      status: 'Published' as const,
      publishedAt: new Date(),
    };
    const { service } = setup(
      [[baseRecipe], [{ id: steps[0].id }], steps, ingredients],
      published,
    );

    await expect(
      service.publish(recipeId, {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'Admin',
      }),
    ).resolves.toMatchObject({ status: 'Published' });
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
