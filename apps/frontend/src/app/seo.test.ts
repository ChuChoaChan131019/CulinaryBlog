import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Fraunces: () => ({ variable: '--font-fraunces' }),
  Plus_Jakarta_Sans: () => ({ variable: '--font-sans-vi' }),
}));
import { metadata as layoutMetadata } from './layout';
import { metadata as homeMetadata } from './page';
import { metadata as recipesMetadata } from './recipes/page';
import { metadata as categoriesMetadata } from './categories/page';
import { generateMetadata as categorySlugMetadata } from './categories/[slug]/page';
import { metadata as searchMetadata } from './search/page';
import { metadata as dashboardLayoutMetadata } from './dashboard/layout';
import { metadata as profileLayoutMetadata } from './profile/layout';

describe('SEO Metadata & Canonical URLs', () => {
  it('layout.tsx chứa metadataBase, openGraph và twitter card hợp lệ', () => {
    expect(layoutMetadata.metadataBase).toBeInstanceOf(URL);
    expect(layoutMetadata.openGraph).toMatchObject({
      type: 'website',
      locale: 'vi_VN',
      url: '/',
    });
    expect(layoutMetadata.twitter).toMatchObject({
      card: 'summary_large_image',
    });
  });

  it('trang chủ / có canonical url trỏ về /', () => {
    expect(homeMetadata.alternates?.canonical).toBe('/');
  });

  it('trang danh sách công thức /recipes có canonical /recipes', () => {
    expect(recipesMetadata.alternates?.canonical).toBe('/recipes');
    expect(recipesMetadata.openGraph?.url).toBe('/recipes');
  });

  it('trang danh mục /categories có canonical /categories', () => {
    expect(categoriesMetadata.alternates?.canonical).toBe('/categories');
    expect(categoriesMetadata.openGraph?.url).toBe('/categories');
  });

  it('trang chi tiết danh mục /categories/[slug] có canonical theo slug', async () => {
    const meta = await categorySlugMetadata({
      params: Promise.resolve({ slug: 'mon-chay' }),
    });
    expect(meta.alternates?.canonical).toBe('/categories/mon-chay');
    expect(meta.openGraph?.url).toBe('/categories/mon-chay');
  });

  it('trang tìm kiếm /search có canonical /search không chứa query param', () => {
    expect(searchMetadata.alternates?.canonical).toBe('/search');
    expect(searchMetadata.openGraph?.url).toBe('/search');
  });

  it('trang dashboard và profile có robots noindex', () => {
    expect(dashboardLayoutMetadata.robots).toMatchObject({ index: false });
    expect(profileLayoutMetadata.robots).toMatchObject({ index: false });
  });
});
