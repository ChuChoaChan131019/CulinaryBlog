import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { GetRecipeBySlugHandler } from './get-recipe-by-slug.handler';
import { GetRecipeBySlugQuery } from './get-recipe-by-slug.query';

describe('GetRecipeBySlugHandler', () => {
  const authorId = 'b5766939-6e3d-41cb-b652-84a185d9207f';
  const recipe = {
    id: '38cd0ac5-58f8-4b9f-9161-c311958c4eed',
    title: 'Bánh mì thịt nướng',
    slug: 'banh-mi-thit-nuong',
    description: 'Bánh mì Việt Nam',
    instructions: 'Nướng thịt rồi kẹp bánh mì.',
    status: 'Published' as const,
    difficulty: 'Medium' as const,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    publishedAt: new Date('2026-09-19T08:00:00.000Z'),
    createdAt: new Date('2026-09-18T08:00:00.000Z'),
    updatedAt: null,
    rowVersion: 1,
    nutritionCalories: '500.00',
    nutritionProtein: null,
    nutritionCarbohydrates: null,
    nutritionFat: null,
    nutritionFiber: null,
    nutritionSodium: null,
    categoryId: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
    categoryName: 'Món Việt',
    categorySlug: 'mon-viet',
    authorId,
    authorDisplayName: 'Trang',
    authorAvatarUrl: null,
  };

  function buildCache(cached: unknown = null) {
    return {
      get: jest.fn().mockResolvedValue(cached),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;
  }

  function ordered(rows: unknown[]) {
    return {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(rows),
        }),
      }),
    };
  }

  function buildDb(
    root:
      | (Omit<typeof recipe, 'status'> & {
          status: 'Draft' | 'Published' | 'Archived';
        })
      | null = recipe,
  ) {
    const select = jest
      .fn()
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(root ? [root] : []),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce(
        ordered([
          {
            id: 'step-1',
            stepNumber: 1,
            title: 'Chuẩn bị',
            description: 'Sơ chế nguyên liệu',
            timerMinutes: null,
            imageUrl: null,
          },
        ]),
      )
      .mockReturnValueOnce(
        ordered([
          {
            id: 'ingredient-1',
            name: 'Thịt heo',
            quantity: '200',
            unit: 'g',
            notes: null,
            orderIndex: 0,
          },
        ]),
      )
      .mockReturnValueOnce(
        ordered([
          {
            id: 'image-1',
            originalUrl: 'https://example.test/original.jpg',
            mediumUrl: 'https://example.test/medium.webp',
            thumbnailUrl: 'https://example.test/thumbnail.webp',
            altText: 'Bánh mì thịt nướng',
            isPrimary: true,
            orderIndex: 0,
          },
        ]),
      );
    return { select };
  }

  it('trả cache 60 phút nhưng vẫn kiểm tra quyền với recipe Draft', async () => {
    const cached = {
      id: recipe.id,
      status: 'Draft' as const,
      author: { id: authorId },
    };
    const db = buildDb();
    const cache = buildCache(cached);
    const handler = new GetRecipeBySlugHandler(db as never, cache);

    await expect(
      handler.execute(new GetRecipeBySlugQuery(recipe.slug)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(cache.get).toHaveBeenCalledWith(
      `recipes:detail:${recipe.slug}`,
      3600,
    );
    expect(db.select).not.toHaveBeenCalled();
  });

  it('trả đủ detail, chuẩn hóa ngày giờ và cache kết quả', async () => {
    const db = buildDb();
    const cache = buildCache();
    const handler = new GetRecipeBySlugHandler(db as never, cache);

    const result = await handler.execute(new GetRecipeBySlugQuery(recipe.slug));

    expect(result).toMatchObject({
      id: recipe.id,
      category: { id: recipe.categoryId, slug: recipe.categorySlug },
      author: { id: authorId, displayName: 'Trang' },
      nutrition: { calories: '500.00' },
      images: [expect.objectContaining({ mediumUrl: expect.any(String) })],
      createdAt: recipe.createdAt.toISOString(),
      publishedAt: recipe.publishedAt.toISOString(),
    });
    expect(cache.set).toHaveBeenCalledWith(
      `recipes:detail:${recipe.slug}`,
      result,
      3600,
    );
  });

  it('cho phép owner xem Draft nhưng từ chối Author khác', async () => {
    const draft = { ...recipe, status: 'Draft' as const };
    const owner = {
      id: authorId,
      email: 'trang@example.com',
      role: 'Author' as const,
    };
    const ownerHandler = new GetRecipeBySlugHandler(
      buildDb(draft) as never,
      buildCache(),
    );
    await expect(
      ownerHandler.execute(new GetRecipeBySlugQuery(recipe.slug, owner)),
    ).resolves.toMatchObject({ status: 'Draft' });

    const strangerHandler = new GetRecipeBySlugHandler(
      buildDb(draft) as never,
      buildCache(),
    );
    await expect(
      strangerHandler.execute(
        new GetRecipeBySlugQuery(recipe.slug, {
          id: 'another-author',
          email: 'other@example.com',
          role: 'Author',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('trả 404 và không cache khi không có recipe phù hợp', async () => {
    const db = buildDb(null);
    const cache = buildCache();
    const handler = new GetRecipeBySlugHandler(db as never, cache);

    await expect(
      handler.execute(new GetRecipeBySlugQuery('khong-ton-tai')),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(cache.set).not.toHaveBeenCalled();
  });
});
