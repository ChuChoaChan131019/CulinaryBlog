import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PgDialect } from 'drizzle-orm/pg-core';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { RecipeDifficulty } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import { UpdateRecipeCommand } from './update-recipe.command';
import { UpdateRecipeHandler } from './update-recipe.handler';

describe('UpdateRecipeHandler', () => {
  const recipeId = '38cd0ac5-58f8-4b9f-9161-c311958c4eed';
  const ownerId = 'b5766939-6e3d-41cb-b652-84a185d9207f';
  const updatedAt = new Date('2026-09-23T10:00:00.000Z');
  const updatedRecipe = {
    id: recipeId,
    title: 'Bánh mì thịt nướng mới',
    slug: 'banh-mi-thit-nuong',
    description: 'Bánh mì Việt Nam',
    instructions: 'Nướng thịt rồi kẹp vào bánh mì',
    prepTime: 15,
    cookTime: 0,
    servings: 4,
    difficulty: 'Medium' as const,
    status: 'Draft' as const,
    categoryId: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
    authorId: ownerId,
    nutritionCalories: null,
    nutritionProtein: '25.5',
    nutritionCarbohydrates: null,
    nutritionFat: null,
    nutritionFiber: null,
    nutritionSodium: null,
    rowVersion: 4,
    createdAt: new Date('2026-09-20T10:00:00.000Z'),
    updatedAt,
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
  const ingredients = [
    {
      id: '5b35002f-bcdf-4a03-b9dd-d858072d2494',
      name: 'Thịt heo',
      quantity: '500',
      unit: 'g',
      notes: null,
      orderIndex: 0,
    },
  ];

  function buildCache() {
    return {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;
  }

  function buildDb(options?: {
    existing?: { id: string; authorId: string } | null;
    category?: { id: string } | null;
    includeCategoryLookup?: boolean;
    updated?: typeof updatedRecipe | null;
  }) {
    const existing =
      options?.existing === undefined
        ? { id: recipeId, authorId: ownerId }
        : options.existing;
    const selectResults: unknown[][] = [existing ? [existing] : []];
    if (options?.includeCategoryLookup) {
      selectResults.push(options.category ? [options.category] : []);
    }
    selectResults.push(steps, ingredients);

    const select = jest.fn().mockImplementation(() => {
      const result = selectResults.shift() ?? [];
      const terminal = {
        limit: jest.fn().mockResolvedValue(result),
        orderBy: jest.fn().mockResolvedValue(result),
      };
      return {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue(terminal),
        }),
      };
    });
    const returning = jest
      .fn()
      .mockResolvedValue(
        options?.updated === null ? [] : [options?.updated ?? updatedRecipe],
      );
    const updateWhere = jest.fn().mockReturnValue({ returning });
    const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
    const tx = {
      select,
      update: jest.fn().mockReturnValue({ set: updateSet }),
    };
    const db = {
      transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    return { db, tx, updateSet, updateWhere };
  }

  function command(
    changes: UpdateRecipeDto = {
      title: updatedRecipe.title,
      cookTime: 0,
      difficulty: RecipeDifficulty.Medium,
      nutrition: { calories: null, protein: 25.5 },
    },
    role: 'Author' | 'Admin' = 'Author',
    userId = ownerId,
  ) {
    return new UpdateRecipeCommand(
      recipeId,
      { id: userId, email: 'trang@example.com', role },
      3,
      changes,
    );
  }

  it.each([
    ['owner', 'Author' as const, ownerId],
    ['Admin', 'Admin' as const, 'admin-id'],
  ])(
    'cho phép %s cập nhật và tăng rowVersion nguyên tử',
    async (_name, role, userId) => {
      const { db, updateSet, updateWhere } = buildDb();
      const cache = buildCache();
      const handler = new UpdateRecipeHandler(db as never, cache);

      const result = await handler.execute(command(undefined, role, userId));

      expect(result).toMatchObject({
        id: recipeId,
        slug: 'banh-mi-thit-nuong',
        status: 'Draft',
        rowVersion: 4,
        nutrition: { calories: null, protein: '25.5' },
        steps,
        ingredients,
      });
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          title: updatedRecipe.title,
          cookTime: 0,
          nutritionCalories: null,
          nutritionProtein: '25.5',
          rowVersion: expect.anything(),
        }),
      );
      const compiledWhere = new PgDialect().sqlToQuery(
        updateWhere.mock.calls[0][0],
      );
      expect(compiledWhere.params).toEqual([recipeId, false, 3]);
      expect(cache.delete).toHaveBeenCalledWith('recipes');
    },
  );

  it('từ chối Author không sở hữu recipe trước khi update', async () => {
    const { db, tx } = buildDb();
    const cache = buildCache();
    const handler = new UpdateRecipeHandler(db as never, cache);

    const promise = handler.execute(
      command(undefined, 'Author', 'author-khac'),
    );

    await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'RECIPE_FORBIDDEN' }),
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('trả RECIPE_NOT_FOUND khi recipe không tồn tại hoặc đã bị xóa', async () => {
    const { db, tx } = buildDb({ existing: null });
    const handler = new UpdateRecipeHandler(db as never, buildCache());

    const promise = handler.execute(command());

    await expect(promise).rejects.toBeInstanceOf(NotFoundException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'RECIPE_NOT_FOUND' }),
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('trả CATEGORY_NOT_FOUND khi category mới không hợp lệ', async () => {
    const { db, tx } = buildDb({
      includeCategoryLookup: true,
      category: null,
    });
    const handler = new UpdateRecipeHandler(db as never, buildCache());

    const promise = handler.execute(
      command({ categoryId: updatedRecipe.categoryId }),
    );

    await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'CATEGORY_NOT_FOUND' }),
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('trả 409 và không xóa cache khi rowVersion không khớp', async () => {
    const { db } = buildDb({ updated: null });
    const cache = buildCache();
    const handler = new UpdateRecipeHandler(db as never, cache);

    const promise = handler.execute(command());

    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({
        type: 'RECIPE_CONCURRENCY_CONFLICT',
        status: 409,
      }),
    });
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('từ chối body rỗng trước khi mở transaction', async () => {
    const { db } = buildDb();
    const handler = new UpdateRecipeHandler(db as never, buildCache());

    await expect(handler.execute(command({}))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
