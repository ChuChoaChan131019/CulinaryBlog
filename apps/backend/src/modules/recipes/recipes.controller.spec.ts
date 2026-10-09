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
    const recipeIngredients = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    const controller = new RecipesController(
      commandBus as never,
      queryBus as never,
      recipeIngredients as never,
      { upload: jest.fn(), setPrimary: jest.fn(), remove: jest.fn() } as never,
      { upload: jest.fn() } as never,
      { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() } as never,
      { getBySlug: jest.fn() } as never,
      { enqueue: jest.fn().mockResolvedValue(undefined) } as never,
    );
    const response = { setHeader: jest.fn() };

    return { controller, commandBus, response, recipeIngredients };
  }

  it('liệt kê nguyên liệu qua service theo recipe và user hiện tại', async () => {
    const { controller, recipeIngredients } = buildController();

    await expect(controller.listIngredients(recipeId, user)).resolves.toEqual(
      [],
    );
    expect(recipeIngredients.list).toHaveBeenCalledWith(recipeId, user);
  });

  it('tạo nguyên liệu qua service', async () => {
    const { controller, recipeIngredients } = buildController();
    const dto = { name: 'Muối', quantity: 1, unit: 'thìa' };
    const ingredient = { id: 'ingredient-id', ...dto };
    recipeIngredients.create.mockResolvedValue(ingredient);

    await expect(controller.createIngredient(recipeId, dto, user)).resolves.toEqual(
      ingredient,
    );
    expect(recipeIngredients.create).toHaveBeenCalledWith(recipeId, dto, user);
  });

  it('cập nhật nguyên liệu qua service', async () => {
    const { controller, recipeIngredients } = buildController();
    const ingredientId = 'b5766939-6e3d-41cb-b652-84a185d9207f';
    const dto = { name: 'Muối biển', quantity: 2, unit: 'thìa' };
    const ingredient = { id: ingredientId, ...dto };
    recipeIngredients.update.mockResolvedValue(ingredient);

    await expect(
      controller.updateIngredient(recipeId, ingredientId, dto, user),
    ).resolves.toEqual(ingredient);
    expect(recipeIngredients.update).toHaveBeenCalledWith(
      recipeId,
      ingredientId,
      dto,
      user,
    );
  });

  it('xóa nguyên liệu qua service', async () => {
    const { controller, recipeIngredients } = buildController();
    const ingredientId = 'b5766939-6e3d-41cb-b652-84a185d9207f';

    await expect(
      controller.deleteIngredient(recipeId, ingredientId, user),
    ).resolves.toBeUndefined();
    expect(recipeIngredients.remove).toHaveBeenCalledWith(
      recipeId,
      ingredientId,
      user,
    );
  });

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

  it.each(['publish', 'unpublish', 'archive'] as const)(
    'gửi command %s với recipe và người dùng hiện tại',
    async (action) => {
      const { controller, commandBus, response } = buildController();

      await expect(
        controller[action](recipeId, user, response as never),
      ).resolves.toEqual(result);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ recipeId, user }),
      );
      expect(commandBus.execute.mock.calls[0][0].constructor.name).toBe(
        {
          publish: 'PublishRecipeCommand',
          unpublish: 'UnpublishRecipeCommand',
          archive: 'ArchiveRecipeCommand',
        }[action],
      );
      // Thay đổi trạng thái tăng rowVersion nên phải trả ETag mới như PUT :id, không thì
      // client giữ ETag cũ sẽ bị 409 oan ở lần ghi kế tiếp.
      expect(response.setHeader).toHaveBeenCalledWith('ETag', '"4"');
    },
  );

  it('gửi DeleteRecipeCommand và trả thành công cho owner', async () => {
    const { controller, commandBus } = buildController();

    await expect(controller.deleteRecipe(recipeId, user)).resolves.toBeUndefined();
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({ recipeId, user }),
    );
    expect(commandBus.execute.mock.calls[0][0].constructor.name).toBe(
      'DeleteRecipeCommand',
    );
  });
});
