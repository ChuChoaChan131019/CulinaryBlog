import 'reflect-metadata';
import { PgDialect } from 'drizzle-orm/pg-core';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { RecipeListDifficulty } from '../dto/get-recipes-query.dto';
import { GetRecipesHandler } from './get-recipes.handler';
import { GetRecipesQuery } from './get-recipes.query';

describe('GetRecipesHandler', () => {
  const createdAt = new Date('2026-09-18T08:00:00.000Z');
  const publishedAt = new Date('2026-09-19T08:00:00.000Z');
  const row = {
    id: '38cd0ac5-58f8-4b9f-9161-c311958c4eed',
    title: 'Bánh mì thịt nướng',
    slug: 'banh-mi-thit-nuong',
    excerpt: 'Bánh mì Việt Nam',
    coverImageUrl: null,
    status: 'Published' as const,
    difficulty: 'Medium' as const,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    authorId: 'b5766939-6e3d-41cb-b652-84a185d9207f',
    authorDisplayName: 'Trang',
    authorAvatarUrl: null,
    categoryId: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
    categoryName: 'Món Việt',
    categorySlug: 'mon-viet',
    publishedAt,
    createdAt,
  };

  const params = {
    page: 2,
    pageSize: 12,
    categoryId: row.categoryId,
    difficulty: RecipeListDifficulty.Medium,
    maxCookTime: 30,
    sort: '-cookTime' as const,
  };

  function buildDb(totalCount = 13, rows = [row]) {
    const countWhere = jest.fn().mockResolvedValue([{ totalCount }]);
    const countFrom = jest.fn().mockReturnValue({ where: countWhere });

    const offset = jest.fn().mockResolvedValue(rows);
    const limit = jest.fn().mockReturnValue({ offset });
    const orderBy = jest.fn().mockReturnValue({ limit });
    const dataWhere = jest.fn().mockReturnValue({ orderBy });
    const secondJoin = jest.fn().mockReturnValue({ where: dataWhere });
    const firstJoin = jest.fn().mockReturnValue({ innerJoin: secondJoin });
    const dataFrom = jest.fn().mockReturnValue({ innerJoin: firstJoin });
    const select = jest
      .fn()
      .mockReturnValueOnce({ from: countFrom })
      .mockReturnValueOnce({ from: dataFrom });

    return { select, countWhere, limit, offset };
  }

  function buildCache(cached: unknown = null) {
    return {
      get: jest.fn().mockResolvedValue(cached),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;
  }

  it('trả cache riêng theo query và quyền hiển thị của người dùng', async () => {
    const cached = {
      items: [],
      totalCount: 0,
      page: 2,
      pageSize: 12,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: true,
    };
    const db = buildDb();
    const cache = buildCache(cached);
    const handler = new GetRecipesHandler(db as never, cache);

    await expect(
      handler.execute(
        new GetRecipesQuery(params, {
          id: row.authorId,
          email: 'trang@example.com',
          role: 'Author',
        }),
      ),
    ).resolves.toEqual(cached);
    expect(cache.get).toHaveBeenCalledWith(
      `recipes:list:Author:${row.authorId}:2:12:${row.categoryId}:Medium:30:-cookTime`,
      900,
    );
    expect(db.select).not.toHaveBeenCalled();
  });

  it('kết hợp phân trang, ánh xạ summary cho UI và cache kết quả 15 phút', async () => {
    const db = buildDb();
    const cache = buildCache();
    const handler = new GetRecipesHandler(db as never, cache);

    const result = await handler.execute(new GetRecipesQuery(params));

    expect(db.limit).toHaveBeenCalledWith(12);
    expect(db.offset).toHaveBeenCalledWith(12);
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: row.id,
          title: row.title,
          category: {
            id: row.categoryId,
            name: row.categoryName,
            slug: row.categorySlug,
          },
          author: {
            id: row.authorId,
            displayName: row.authorDisplayName,
            avatarUrl: null,
          },
          publishedAt: publishedAt.toISOString(),
          createdAt: createdAt.toISOString(),
        }),
      ],
      totalCount: 13,
      page: 2,
      pageSize: 12,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect(cache.set).toHaveBeenCalledWith(
      `recipes:list:Guest:2:12:${row.categoryId}:Medium:30:-cookTime`,
      result,
      900,
    );
  });

  it('trả danh sách rỗng thay vì 404 khi category không có công thức', async () => {
    const db = buildDb(0, []);
    const handler = new GetRecipesHandler(db as never, buildCache());

    await expect(
      handler.execute(new GetRecipesQuery({ ...params, page: 1 })),
    ).resolves.toMatchObject({
      items: [],
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it.each([
    {
      name: 'Guest chỉ thấy Published',
      user: undefined,
      expectedParams: [false, 'Published'],
    },
    {
      name: 'Author thấy Published và Draft/Archived của chính mình',
      user: {
        id: row.authorId,
        email: 'trang@example.com',
        role: 'Author' as const,
      },
      expectedParams: [
        false,
        'Published',
        row.authorId,
        'Draft',
        'Archived',
      ],
    },
    {
      name: 'Admin thấy mọi trạng thái',
      user: {
        id: row.authorId,
        email: 'admin@example.com',
        role: 'Admin' as const,
      },
      expectedParams: [false],
    },
  ])('$name', async ({ user, expectedParams }) => {
    const db = buildDb(0, []);
    const handler = new GetRecipesHandler(db as never, buildCache());

    await handler.execute(
      new GetRecipesQuery(
        {
          page: 1,
          pageSize: 12,
          sort: '-createdAt',
        },
        user,
      ),
    );

    const condition = db.countWhere.mock.calls[0][0];
    const compiled = new PgDialect().sqlToQuery(condition);
    expect(compiled.params).toEqual(expectedParams);
  });
});
