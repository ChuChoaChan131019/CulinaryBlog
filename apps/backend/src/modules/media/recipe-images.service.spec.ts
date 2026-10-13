import { CacheService } from '../../infrastructure/cache/cache.service';
import { FileStorageService } from './file-storage.service';
import { RecipeImagesService } from './recipe-images.service';

describe('RecipeImagesService cache invalidation', () => {
  const recipeId = '38cd0ac5-58f8-4b9f-9161-c311958c4eed';
  const imageId = 'b5766939-6e3d-41cb-b652-84a185d9207f';
  const user = {
    id: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
    email: 'trang@example.com',
    role: 'Author' as const,
  };

  it('xóa cache recipes sau khi đổi ảnh chính thành công', async () => {
    const image = {
      id: imageId,
      recipeId,
      originalUrl: 'https://example.test/original.jpg',
      altText: 'Bánh mì thịt nướng',
      isPrimary: false,
    };
    const transactionSelect = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([image]),
        }),
      }),
    });
    const transactionUpdate = jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest
            .fn()
            .mockResolvedValue([{ ...image, isPrimary: true }]),
        }),
      }),
    });
    const transaction = {
      select: transactionSelect,
      update: transactionUpdate,
    };
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest
              .fn()
              .mockResolvedValue([{ id: recipeId, authorId: user.id }]),
          }),
        }),
      }),
      transaction: jest.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    const cache = {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;
    const service = new RecipeImagesService(
      db as never,
      {} as FileStorageService,
      cache,
    );

    await expect(
      service.setPrimary(recipeId, imageId, user),
    ).resolves.toMatchObject({
      imageId,
      isPrimary: true,
    });
    expect(cache.delete).toHaveBeenCalledWith('recipes');
  });
});
