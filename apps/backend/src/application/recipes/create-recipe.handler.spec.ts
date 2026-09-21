import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { CreateRecipeCommand } from './create-recipe.command';
import { CreateRecipeHandler } from './create-recipe.handler';

describe('CreateRecipeHandler', () => {
  const command = new CreateRecipeCommand(
    'author-1', 'Bánh mì thịt nướng', 'Bánh mì Việt Nam', 'category-1',
    15, 20, 4, 'Medium', 'Nướng thịt rồi kẹp vào bánh mì',
    { calories: 450 },
    [{ stepNumber: 1, title: 'Nướng thịt', description: 'Nướng đến khi chín' }],
    [{ name: 'Thịt heo', quantity: 500, unit: 'g' }],
  );

  function setup() {
    const repository = {
      categoryExists: jest.fn().mockResolvedValue(true),
      slugExists: jest.fn().mockResolvedValue(false),
      createDraft: jest.fn().mockResolvedValue({ id: 'recipe-1', slug: 'banh-mi-thit-nuong', status: 'Draft' }),
    };
    const cache = { delete: jest.fn().mockResolvedValue(undefined) };
    return { repository, cache, handler: new CreateRecipeHandler(repository as never, cache as never) };
  }

  it('creates a draft and invalidates recipe cache', async () => {
    const { repository, cache, handler } = setup();
    await expect(handler.execute(command)).resolves.toMatchObject({ id: 'recipe-1', status: 'Draft' });
    expect(repository.createDraft).toHaveBeenCalledWith(expect.objectContaining({
      authorId: command.authorId, categoryId: command.categoryId,
      slug: 'banh-mi-thit-nuong', steps: command.steps, ingredients: command.ingredients,
    }));
    expect(cache.delete).toHaveBeenCalledWith('recipes');
  });

  it('adds a numeric suffix when the slug is already used', async () => {
    const { repository, handler } = setup();
    repository.slugExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await handler.execute(command);
    expect(repository.createDraft).toHaveBeenCalledWith(expect.objectContaining({ slug: 'banh-mi-thit-nuong-1' }));
  });

  it('rejects a missing or deleted category before writing', async () => {
    const { repository, handler } = setup();
    repository.categoryExists.mockResolvedValue(false);
    await expect(handler.execute(command)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(repository.createDraft).not.toHaveBeenCalled();
  });

  it('maps a concurrent unique-slug violation to the existing API error', async () => {
    const { repository, handler } = setup();
    repository.createDraft.mockRejectedValue(Object.assign(new Error('duplicate key'), {
      code: '23505', constraint: 'recipes_slug_unique',
    }));
    await expect(handler.execute(command)).rejects.toBeInstanceOf(ConflictException);
  });
});
