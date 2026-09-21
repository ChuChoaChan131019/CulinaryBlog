import { GetCategoriesHandler } from './get-categories.handler';
import { GetCategoriesQuery } from './get-categories.query';

describe('GetCategoriesHandler', () => {
  const categories = [{
    id: 'category-1', name: 'Bánh ngọt', slug: 'banh-ngot',
    description: null, imageUrl: null, recipeCount: 2,
  }];

  it('returns cached categories without querying the repository', async () => {
    const repository = { listActiveWithRecipeCount: jest.fn() };
    const cache = { get: jest.fn().mockResolvedValue(categories), set: jest.fn() };
    const handler = new GetCategoriesHandler(repository as never, cache as never);

    await expect(handler.execute(new GetCategoriesQuery())).resolves.toEqual(categories);
    expect(cache.get).toHaveBeenCalledWith('categories:all', 3600);
    expect(repository.listActiveWithRecipeCount).not.toHaveBeenCalled();
  });

  it('caches repository results including an empty list', async () => {
    const repository = { listActiveWithRecipeCount: jest.fn().mockResolvedValue([]) };
    const cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) };
    const handler = new GetCategoriesHandler(repository as never, cache as never);

    await expect(handler.execute(new GetCategoriesQuery())).resolves.toEqual([]);
    expect(repository.listActiveWithRecipeCount).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith('categories:all', [], 3600);
  });
});
