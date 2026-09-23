import { BadRequestException } from '@nestjs/common';
import { RecipesController } from './recipes.controller';

describe('RecipesController update', () => {
  const recipeId = '38cd0ac5-58f8-4b9f-9161-c311958c4eed';
  const user = {
    id: 'b5766939-6e3d-41cb-b652-84a185d9207f',
    email: 'trang@example.com',
    role: 'Author' as const,
  };
  const result = {
    id: recipeId,
    title: 'Bánh mì thịt nướng mới',
    slug: 'banh-mi-thit-nuong',
    description: 'Bánh mì Việt Nam',
    instructions: 'Nướng thịt',
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    difficulty: 'Medium' as const,
    status: 'Draft' as const,
    categoryId: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
    authorId: user.id,
    nutrition: {
      calories: null,
      protein: null,
      carbohydrates: null,
      fat: null,
      fiber: null,
      sodium: null,
    },
    steps: [],
    ingredients: [],
    rowVersion: 4,
    createdAt: new Date('2026-09-20T10:00:00.000Z'),
    updatedAt: new Date('2026-09-23T10:00:00.000Z'),
  };

  function buildController() {
    const commandBus = { execute: jest.fn().mockResolvedValue(result) };
    const queryBus = { execute: jest.fn() };
    const controller = new RecipesController(
      commandBus as never,
      queryBus as never,
    );
    const response = { setHeader: jest.fn() };

    return { controller, commandBus, response };
  }

  it.each(['3', '"3"'])('đọc If-Match %s và trả ETag mới', async (ifMatch) => {
    const { controller, commandBus, response } = buildController();
    const dto = { title: result.title };

    await expect(
      controller.update(recipeId, user, ifMatch, dto, response as never),
    ).resolves.toEqual(result);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        recipeId,
        user,
        expectedRowVersion: 3,
        changes: dto,
      }),
    );
    expect(response.setHeader).toHaveBeenCalledWith('ETag', '"4"');
  });

  it.each([undefined, '', '0', '-1', 'abc', 'W/"3"'])(
    'từ chối If-Match không hợp lệ: %s',
    async (ifMatch) => {
      const { controller, commandBus, response } = buildController();

      await expect(
        controller.update(
          recipeId,
          user,
          ifMatch,
          { title: result.title },
          response as never,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(commandBus.execute).not.toHaveBeenCalled();
    },
  );
});
