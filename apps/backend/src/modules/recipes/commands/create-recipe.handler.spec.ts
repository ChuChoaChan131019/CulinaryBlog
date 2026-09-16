import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  recipeIngredients,
  recipes,
  recipeSteps,
} from '../../../infrastructure/database/schema';
import { RecipeDifficulty } from '../dto/create-recipe.dto';
import { CreateRecipeCommand } from './create-recipe.command';
import { CreateRecipeHandler } from './create-recipe.handler';

describe('CreateRecipeHandler', () => {
  const createdAt = new Date('2026-09-16T00:00:00.000Z');
  const command = new CreateRecipeCommand(
    'b5766939-6e3d-41cb-b652-84a185d9207f',
    'Bánh mì thịt nướng',
    'Bánh mì Việt Nam',
    'f8050eb8-9d4b-4ce6-a94f-68b590119185',
    15,
    20,
    4,
    RecipeDifficulty.Medium,
    'Nướng thịt rồi kẹp vào bánh mì',
    { calories: 450 },
    [
      {
        stepNumber: 1,
        title: 'Nướng thịt',
        description: 'Nướng thịt đến khi chín vàng',
        timerMinutes: 15,
      },
    ],
    [{ name: 'Thịt heo', quantity: 500, unit: 'g' }],
  );

  const createdRecipe = {
    id: '38cd0ac5-58f8-4b9f-9161-c311958c4eed',
    title: command.title,
    slug: 'banh-mi-thit-nuong',
    description: command.description,
    instructions: command.instructions,
    prepTime: command.prepTime,
    cookTime: command.cookTime,
    servings: command.servings,
    difficulty: command.difficulty,
    status: 'Draft' as const,
    categoryId: command.categoryId,
    authorId: command.authorId,
    nutritionCalories: '450',
    nutritionProtein: null,
    nutritionCarbohydrates: null,
    nutritionFat: null,
    nutritionFiber: null,
    nutritionSodium: null,
    createdAt,
    updatedAt: null,
  };

  function buildDb(selectResults: unknown[][], transactionError?: unknown) {
    const recipeValues = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([createdRecipe]),
    });
    const stepValues = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([
        {
          id: 'd56c6dd0-d95a-488a-bb25-dbd616d7994b',
          ...command.steps![0],
          imageUrl: null,
        },
      ]),
    });
    const ingredientValues = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([
        {
          id: '5b35002f-bcdf-4a03-b9dd-d858072d2494',
          name: 'Thịt heo',
          quantity: '500',
          unit: 'g',
          notes: null,
          orderIndex: 0,
        },
      ]),
    });
    const tx = {
      insert: jest.fn((table: unknown) => {
        if (table === recipes) return { values: recipeValues };
        if (table === recipeSteps) return { values: stepValues };
        if (table === recipeIngredients) return { values: ingredientValues };
        throw new Error('Unexpected table');
      }),
    };
    const db = {
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(selectResults.shift() ?? []),
          }),
        }),
      })),
      transaction: transactionError
        ? jest.fn().mockRejectedValue(transactionError)
        : jest.fn((callback: (transaction: typeof tx) => unknown) =>
            callback(tx),
          ),
    };

    return { db, recipeValues, stepValues, ingredientValues };
  }

  function buildCache() {
    return {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;
  }

  it('tạo recipe ở trạng thái Draft cùng dữ liệu con trong một transaction', async () => {
    const { db, recipeValues, stepValues, ingredientValues } = buildDb([
      [{ id: command.categoryId }],
      [],
    ]);
    const cache = buildCache();
    const handler = new CreateRecipeHandler(db as never, cache);

    const result = await handler.execute(command);

    expect(result).toMatchObject({
      id: createdRecipe.id,
      slug: 'banh-mi-thit-nuong',
      status: 'Draft',
      nutrition: { calories: '450' },
    });
    expect(recipeValues).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'banh-mi-thit-nuong', status: 'Draft' }),
    );
    expect(stepValues).toHaveBeenCalledWith([
      expect.objectContaining({ recipeId: createdRecipe.id, stepNumber: 1 }),
    ]);
    expect(ingredientValues).toHaveBeenCalledWith([
      expect.objectContaining({
        recipeId: createdRecipe.id,
        quantity: '500',
        orderIndex: 0,
      }),
    ]);
    expect(cache.delete).toHaveBeenCalledWith('recipes');
  });

  it('tự thêm hậu tố tăng dần khi slug đã tồn tại', async () => {
    const { db, recipeValues } = buildDb([
      [{ id: command.categoryId }],
      [{ id: 'existing' }],
      [],
    ]);
    const handler = new CreateRecipeHandler(db as never, buildCache());

    await handler.execute(command);

    expect(recipeValues).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'banh-mi-thit-nuong-1' }),
    );
  });

  it('trả 422 khi categoryId không tồn tại hoặc đã bị xóa', async () => {
    const { db } = buildDb([[]]);
    const handler = new CreateRecipeHandler(db as never, buildCache());

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('trả RECIPE_SLUG_EXISTS khi có tranh chấp unique slug đồng thời', async () => {
    const databaseError = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'recipes_slug_unique',
    });
    const { db } = buildDb([[{ id: command.categoryId }], []], databaseError);
    const handler = new CreateRecipeHandler(db as never, buildCache());

    const promise = handler.execute(command);

    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({
        type: 'RECIPE_SLUG_EXISTS',
        status: 409,
      }),
    });
  });
});
