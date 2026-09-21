import { GetRecipesHandler } from './get-recipes.handler';
import { GetRecipesQuery } from './get-recipes.query';

describe('GetRecipesHandler', () => {
  const params = {
    page: 2, pageSize: 12, categoryId: 'category-1',
    difficulty: 'Medium' as const, maxCookTime: 30, sort: '-cookTime' as const,
  };
  const result = {
    items: [], totalCount: 0, page: 2, pageSize: 12,
    totalPages: 0, hasNextPage: false, hasPreviousPage: true,
  };

  it('returns a visibility-specific cache hit', async () => {
    const repository = { list: jest.fn() };
    const cache = { get: jest.fn().mockResolvedValue(result), set: jest.fn() };
    const handler = new GetRecipesHandler(repository as never, cache as never);

    await expect(handler.execute(new GetRecipesQuery(params, { id: 'author-1', role: 'Author' })))
      .resolves.toEqual(result);
    expect(cache.get).toHaveBeenCalledWith(
      'recipes:list:Author:author-1:2:12:category-1:Medium:30:-cookTime', 900,
    );
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('passes the viewer to the repository and caches its page', async () => {
    const repository = { list: jest.fn().mockResolvedValue(result) };
    const cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) };
    const handler = new GetRecipesHandler(repository as never, cache as never);
    const viewer = { id: 'admin-1', role: 'Admin' as const };

    await expect(handler.execute(new GetRecipesQuery(params, viewer))).resolves.toEqual(result);
    expect(repository.list).toHaveBeenCalledWith({ ...params, viewer });
    expect(cache.set).toHaveBeenCalledWith(
      'recipes:list:Admin:2:12:category-1:Medium:30:-cookTime', result, 900,
    );
  });
});
