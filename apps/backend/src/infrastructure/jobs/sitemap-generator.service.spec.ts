import {
  renderSitemap,
  SitemapGeneratorService,
} from './sitemap-generator.service';

describe('SitemapGeneratorService', () => {
  it('render XML với namespace và escape ký tự đặc biệt', () => {
    const xml = renderSitemap([
      {
        loc: 'https://example.test/recipes/a&b',
        lastmod: new Date('2026-10-12T02:00:00.000Z'),
        changefreq: 'weekly',
        priority: 0.8,
      },
    ]);

    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).toContain('<loc>https://example.test/recipes/a&amp;b</loc>');
    expect(xml).toContain('<lastmod>2026-10-12T02:00:00.000Z</lastmod>');
  });

  it('query projection và tạo URL cho static, category, Published recipe', async () => {
    const recipeRows = [
      {
        slug: 'pho-bo',
        updatedAt: null,
        publishedAt: new Date('2026-10-10T00:00:00.000Z'),
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
      },
    ];
    const categoryRows = [
      {
        slug: 'mon-viet',
        updatedAt: new Date('2026-10-11T00:00:00.000Z'),
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    ];
    const query = (rows: unknown[]) => ({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(rows),
        }),
      }),
    });
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(query(recipeRows))
        .mockReturnValueOnce(query(categoryRows)),
    };
    const config = { get: jest.fn().mockReturnValue('https://example.test') };
    const service = new SitemapGeneratorService(db as never, config as never);

    const result = await service.generate();

    expect(result.urlCount).toBe(5);
    expect(result.recipeCount).toBe(1);
    expect(result.categoryCount).toBe(1);
    expect(result.xml).toContain('<loc>https://example.test/recipes/pho-bo</loc>');
    expect(result.xml).toContain('<loc>https://example.test/categories/mon-viet</loc>');
    expect(result.xml).toContain('<lastmod>2026-10-11T00:00:00.000Z</lastmod>');
  });
});
