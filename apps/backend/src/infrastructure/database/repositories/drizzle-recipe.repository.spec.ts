import { PgDialect } from 'drizzle-orm/pg-core';
import { recipeIngredients, recipes, recipeSteps } from '../schema';
import { DrizzleRecipeRepository } from './drizzle-recipe.repository';

describe('DrizzleRecipeRepository', () => {
  const createdAt = new Date('2026-09-16T00:00:00.000Z');
  const draft = {
    authorId: 'author-1', title: 'Bánh mì thịt nướng', slug: 'banh-mi-thit-nuong',
    description: 'Bánh mì Việt Nam', categoryId: 'category-1',
    prepTime: 15, cookTime: 20, servings: 4, difficulty: 'Medium' as const,
    instructions: 'Nướng thịt rồi kẹp vào bánh mì', nutrition: { calories: 450 },
    steps: [{ stepNumber: 1, title: 'Nướng thịt', description: 'Nướng đến khi chín' }],
    ingredients: [{ name: 'Thịt heo', quantity: 500, unit: 'g' }],
  };

  it('persists draft, steps and ingredients in one transaction', async () => {
    const created = {
      ...draft, id: 'recipe-1', status: 'Draft',
      nutritionCalories: '450', nutritionProtein: null, nutritionCarbohydrates: null,
      nutritionFat: null, nutritionFiber: null, nutritionSodium: null,
      createdAt, updatedAt: null,
    };
    const recipeValues = jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([created]) });
    const stepValues = jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([
      { id: 'step-1', ...draft.steps[0], timerMinutes: null, imageUrl: null },
    ]) });
    const ingredientValues = jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([
      { id: 'ingredient-1', name: 'Thịt heo', quantity: '500', unit: 'g', notes: null, orderIndex: 0 },
    ]) });
    const tx = { insert: jest.fn((table: unknown) => {
      if (table === recipes) return { values: recipeValues };
      if (table === recipeSteps) return { values: stepValues };
      if (table === recipeIngredients) return { values: ingredientValues };
      throw new Error('Unexpected table');
    }) };
    const db = { transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) };
    const repository = new DrizzleRecipeRepository(db as never);

    await expect(repository.createDraft(draft)).resolves.toMatchObject({
      id: 'recipe-1', status: 'Draft', nutrition: { calories: '450' },
    });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(recipeValues).toHaveBeenCalledWith(expect.objectContaining({ slug: draft.slug, status: 'Draft' }));
    expect(stepValues).toHaveBeenCalledWith([expect.objectContaining({ recipeId: 'recipe-1', stepNumber: 1 })]);
    expect(ingredientValues).toHaveBeenCalledWith([expect.objectContaining({
      recipeId: 'recipe-1', quantity: '500', orderIndex: 0,
    })]);
  });

  function listDb() {
    const countWhere = jest.fn().mockResolvedValue([{ totalCount: 0 }]);
    const countFrom = jest.fn().mockReturnValue({ where: countWhere });
    const offset = jest.fn().mockResolvedValue([]);
    const limit = jest.fn().mockReturnValue({ offset });
    const orderBy = jest.fn().mockReturnValue({ limit });
    const dataWhere = jest.fn().mockReturnValue({ orderBy });
    const secondJoin = jest.fn().mockReturnValue({ where: dataWhere });
    const firstJoin = jest.fn().mockReturnValue({ innerJoin: secondJoin });
    const dataFrom = jest.fn().mockReturnValue({ innerJoin: firstJoin });
    const select = jest.fn().mockReturnValueOnce({ from: countFrom }).mockReturnValueOnce({ from: dataFrom });
    return { db: { select }, countWhere, limit, offset };
  }

  it.each([
    { role: 'Guest', viewer: undefined, expected: [false, 'Published'] },
    { role: 'Author', viewer: { id: 'author-1', role: 'Author' as const },
      expected: [false, 'Published', 'author-1', 'Draft', 'Archived'] },
    { role: 'Admin', viewer: { id: 'admin-1', role: 'Admin' as const }, expected: [false] },
  ])('applies $role visibility in both count and rows', async ({ viewer, expected }) => {
    const { db, countWhere, limit, offset } = listDb();
    const repository = new DrizzleRecipeRepository(db as never);
    const result = await repository.list({ page: 2, pageSize: 12, sort: '-createdAt', viewer });

    const condition = countWhere.mock.calls[0][0];
    expect(new PgDialect().sqlToQuery(condition).params).toEqual(expected);
    expect(limit).toHaveBeenCalledWith(12);
    expect(offset).toHaveBeenCalledWith(12);
    expect(result).toMatchObject({ items: [], totalCount: 0, totalPages: 0 });
  });
});
