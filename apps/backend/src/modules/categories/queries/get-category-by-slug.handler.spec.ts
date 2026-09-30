import { NotFoundException } from '@nestjs/common';
import { PagedResult, RecipeSummaryDto } from '@culinary/shared';
import { GetCategoryBySlugHandler } from './get-category-by-slug.handler';
import { GetCategoryBySlugQuery } from './get-category-by-slug.query';

describe('GetCategoryBySlugHandler', () => {
  const category = {
    id: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
    name: 'Món Việt',
    slug: 'mon-viet',
    description: 'Công thức Việt Nam',
    imageUrl: null,
    recipeCount: 2,
  };
  const recipes: PagedResult<RecipeSummaryDto> = {
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  function buildDb(result: typeof category | undefined) {
    const groupBy = jest.fn().mockResolvedValue(result ? [result] : []);
    const where = jest.fn().mockReturnValue({ groupBy });
    const leftJoin = jest.fn().mockReturnValue({ where });
    const from = jest.fn().mockReturnValue({ leftJoin });
    const select = jest.fn().mockReturnValue({ from });

    return { select, from, leftJoin, where, groupBy };
  }

  it('trả CATEGORY_NOT_FOUND khi slug không tồn tại hoặc đã bị xóa', async () => {
    const db = buildDb(undefined);
    const queryBus = { execute: jest.fn() };
    const handler = new GetCategoryBySlugHandler(
      db as never,
      queryBus as never,
    );

    await expect(
      handler.execute(
        new GetCategoryBySlugQuery('khong-ton-tai', { page: 1, pageSize: 12 }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      handler.execute(
        new GetCategoryBySlugQuery('khong-ton-tai', { page: 1, pageSize: 12 }),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        type: 'CATEGORY_NOT_FOUND',
        status: 404,
      }),
    });
    expect(queryBus.execute).not.toHaveBeenCalled();
  });

  it('trả category và phân trang recipe với policy chỉ thêm Draft của Author', async () => {
    const db = buildDb(category);
    const queryBus = {
      execute: jest.fn().mockResolvedValue(recipes),
    };
    const user = {
      id: 'b5766939-6e3d-41cb-b652-84a185d9207f',
      email: 'author@example.com',
      role: 'Author' as const,
    };
    const handler = new GetCategoryBySlugHandler(
      db as never,
      queryBus as never,
    );

    await expect(
      handler.execute(
        new GetCategoryBySlugQuery('mon-viet', { page: 2, pageSize: 24 }, user),
      ),
    ).resolves.toEqual({ category, recipes });
    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          page: 2,
          pageSize: 24,
          categoryId: category.id,
          sort: '-createdAt',
        },
        user,
        ownerStatuses: ['Draft'],
      }),
    );
  });
});
