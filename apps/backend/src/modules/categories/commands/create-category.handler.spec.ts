import { ConflictException } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { categories } from '../../../infrastructure/database/schema';
import { CreateCategoryCommand } from './create-category.command';
import { CreateCategoryHandler } from './create-category.handler';

describe('CreateCategoryHandler', () => {
  const command = new CreateCategoryCommand(
    'Món Việt',
    'Món ăn gia đình',
    'https://example.com/mon-viet.jpg',
  );
  const created = {
    id: 'category-1',
    name: command.name,
    slug: 'mon-viet',
    description: command.description,
  };

  function buildDb(selectResults: unknown[][], insertErrors: unknown[] = []) {
    const values = jest.fn(() => ({
      returning: jest.fn().mockImplementation(async () => {
        const error = insertErrors.shift();
        if (error) throw error;
        return [created];
      }),
    }));
    const insert = jest.fn(() => ({ values }));
    const db = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue(selectResults.shift() ?? []),
          })),
        })),
      })),
      insert,
    };
    return { db, insert, values };
  }

  const buildCache = () =>
    ({ delete: jest.fn().mockResolvedValue(undefined) }) as unknown as CacheService;

  it('tạo category, slug tiếng Việt và invalidate cache', async () => {
    const { db, insert } = buildDb([[], []]);
    const cache = buildCache();
    const handler = new CreateCategoryHandler(db as never, cache);

    await expect(handler.execute(command)).resolves.toEqual(created);
    expect(insert).toHaveBeenCalledWith(categories);
    expect(cache.delete).toHaveBeenCalledWith('categories:all');
  });

  it('dùng hậu tố -2, -3 khi slug đã tồn tại', async () => {
    const { db, values } = buildDb([
      [],
      [{ id: 'slug-1' }],
      [{ id: 'slug-2' }],
      [],
    ]);
    const handler = new CreateCategoryHandler(db as never, buildCache());

    await handler.execute(command);

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'mon-viet-3' }),
    );
  });

  it('trả CATEGORY_NAME_EXISTS khi tên trùng', async () => {
    const { db, insert } = buildDb([[{ id: 'existing-name' }]]);
    const handler = new CreateCategoryHandler(db as never, buildCache());

    await expect(handler.execute(command)).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'CATEGORY_NAME_EXISTS', status: 409 }),
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it('đổi slug khi insert gặp tranh chấp unique đồng thời', async () => {
    const slugError = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'categories_slug_unique',
    });
    const { db, values } = buildDb([[], []], [slugError]);
    const handler = new CreateCategoryHandler(db as never, buildCache());

    await expect(handler.execute(command)).resolves.toEqual(created);
    expect(values).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ slug: 'mon-viet-2' }),
    );
  });

  it('trả conflict khi insert gặp tranh chấp tên đồng thời', async () => {
    const nameError = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'categories_name_unique',
    });
    const { db } = buildDb([[], []], [nameError]);
    const handler = new CreateCategoryHandler(db as never, buildCache());

    await expect(handler.execute(command)).rejects.toBeInstanceOf(ConflictException);
  });
});
