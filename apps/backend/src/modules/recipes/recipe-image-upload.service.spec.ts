import { RecipeImageUploadService } from './recipe-image-upload.service';

describe('RecipeImageUploadService', () => {
  const user = {
    id: 'b5766939-6e3d-41cb-b652-84a185d9207f',
    email: 'owner@example.com',
    role: 'Author' as const,
  };
  const file = {
    buffer: Buffer.from('image'),
    mimetype: 'image/jpeg',
    originalname: 'dish.jpg',
    size: 5,
  };
  const storedImage = {
    imageId: '38cd0ac5-58f8-4b9f-9161-c311958c4eed',
    originalUrl: 'http://minio/culinary-blog/recipes/1/original.jpg',
    objectKey: 'recipes/1/original.jpg',
    altText: null,
    isPrimary: true,
  };

  it('enqueue resize sau khi upload và không lộ object key', async () => {
    const recipeImages = { upload: jest.fn().mockResolvedValue(storedImage) };
    const resizeQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const service = new RecipeImageUploadService(
      recipeImages as never,
      resizeQueue as never,
    );

    await expect(service.upload('recipe-1', user, file)).resolves.toEqual({
      imageId: storedImage.imageId,
      originalUrl: storedImage.originalUrl,
      altText: null,
      isPrimary: true,
    });
    expect(resizeQueue.enqueue).toHaveBeenCalledWith({
      imageId: storedImage.imageId,
      recipeId: 'recipe-1',
      sourceObjectKey: storedImage.objectKey,
    });
  });

  it('không làm thất bại upload khi Redis enqueue lỗi', async () => {
    const recipeImages = { upload: jest.fn().mockResolvedValue(storedImage) };
    const resizeQueue = {
      enqueue: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
    };
    const service = new RecipeImageUploadService(
      recipeImages as never,
      resizeQueue as never,
    );

    await expect(service.upload('recipe-1', user, file)).resolves.toMatchObject({
      imageId: storedImage.imageId,
      originalUrl: storedImage.originalUrl,
    });
  });
});
