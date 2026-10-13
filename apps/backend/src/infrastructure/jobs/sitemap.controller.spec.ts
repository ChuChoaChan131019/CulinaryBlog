import { SitemapController } from './sitemap.controller';

describe('SitemapController', () => {
  it('trả raw XML thay vì response envelope', async () => {
    const storage = {
      readAsync: jest.fn().mockResolvedValue(Buffer.from('<urlset />', 'utf8')),
    };
    const response = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    const controller = new SitemapController(storage as never);

    await controller.getSitemap(response as never);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/xml; charset=utf-8',
    );
    expect(response.send).toHaveBeenCalledWith(Buffer.from('<urlset />', 'utf8'));
  });

  it('trả 404 ProblemDetails khi object chưa được tạo', async () => {
    const storage = {
      readAsync: jest.fn().mockRejectedValue({ name: 'NoSuchKey' }),
    };
    const controller = new SitemapController(storage as never);

    await expect(controller.getSitemap({} as never)).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'SITEMAP_NOT_FOUND' }),
    });
  });
});
