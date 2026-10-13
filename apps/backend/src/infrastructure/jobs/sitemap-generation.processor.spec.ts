import { processSitemapGeneration, SITEMAP_OBJECT_KEY } from './sitemap-generation.processor';

describe('sitemap generation processor', () => {
  it('upload XML vào object key cố định với content type XML', async () => {
    const generator = {
      generate: jest.fn().mockResolvedValue({
        xml: '<urlset />',
        urlCount: 1,
        recipeCount: 0,
        categoryCount: 0,
      }),
    };
    const storage = { putAsync: jest.fn().mockResolvedValue(undefined) };
    const stages: string[] = [];

    const result = await processSitemapGeneration(generator, storage, (stage) => {
      stages.push(stage);
    });

    expect(result.urlCount).toBe(1);
    expect(stages).toEqual(['generate', 'upload']);
    expect(storage.putAsync).toHaveBeenCalledWith(SITEMAP_OBJECT_KEY, {
      buffer: Buffer.from('<urlset />', 'utf8'),
      contentType: 'application/xml; charset=utf-8',
    });
  });

  it('đẩy lỗi upload lên BullMQ để retry', async () => {
    const error = new Error('MinIO unavailable');
    const generator = {
      generate: jest.fn().mockResolvedValue({
        xml: '<urlset />',
        urlCount: 1,
        recipeCount: 0,
        categoryCount: 0,
      }),
    };
    const storage = { putAsync: jest.fn().mockRejectedValue(error) };

    await expect(processSitemapGeneration(generator, storage)).rejects.toBe(error);
  });
});
