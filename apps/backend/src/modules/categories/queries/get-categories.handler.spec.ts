import { CacheService } from '../../../infrastructure/cache/cache.service';
import { GetCategoriesHandler } from './get-categories.handler';
import { GetCategoriesQuery } from './get-categories.query';

describe('GetCategoriesHandler', () => {
  const categories = [
    {
      id: 'category-1',
      name: 'Bánh ngọt',
      slug: 'banh-ngot',
      description: null,
      imageUrl: null,
      recipeCount: 2,
    },
  ];

  const buildDb = (result: typeof categories) => {
    const orderBy = jest.fn().mockResolvedValue(result);
    const groupBy = jest.fn().mockReturnValue({ orderBy });
    const where = jest.fn().mockReturnValue({ groupBy });
    const leftJoin = jest.fn().mockReturnValue({ where });
    const from = jest.fn().mockReturnValue({ leftJoin });
    const select = jest.fn().mockReturnValue({ from });

    return { select, from, leftJoin, where, groupBy, orderBy };
  };

  it('trả dữ liệu cache và không truy vấn database khi cache hit', async () => {
    const db = buildDb(categories);
    const cache = {
      get: jest.fn().mockResolvedValue(categories),
      set: jest.fn(),
    } as unknown as CacheService;
    const handler = new GetCategoriesHandler(db as never, cache);

    await expect(handler.execute(new GetCategoriesQuery())).resolves.toEqual(categories);
    expect(cache.get).toHaveBeenCalledWith('categories:all', 3600);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('truy vấn và cache cả danh sách rỗng khi cache miss hoặc không khả dụng', async () => {
    const db = buildDb([]);
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;
    const handler = new GetCategoriesHandler(db as never, cache);

    await expect(handler.execute(new GetCategoriesQuery())).resolves.toEqual([]);
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith('categories:all', [], 3600);
  });

  it('đưa kết quả database vào cache sau cache miss', async () => {
    const db = buildDb(categories);
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;
    const handler = new GetCategoriesHandler(db as never, cache);

    await expect(handler.execute(new GetCategoriesQuery())).resolves.toEqual(categories);
    expect(db.orderBy).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith('categories:all', categories, 3600);
  });
});
