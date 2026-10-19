import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
    'aria-label'?: string;
    'aria-current'?: string;
  }) => createElement('a', { href, ...props }, children),
}));

import { Pagination } from './Pagination';

const baseMeta = {
  totalCount: 120,
  pageSize: 12,
  totalPages: 10,
  hasNextPage: true,
  hasPreviousPage: true,
};

function renderPagination(page: number, overrides: Partial<typeof baseMeta> = {}) {
  return renderToStaticMarkup(
    createElement(Pagination, {
      meta: { ...baseMeta, ...overrides, page },
      hrefForPage: (nextPage) => `/recipes?page=${nextPage}&sort=-createdAt`,
      label: 'Phân trang công thức',
    }),
  );
}

describe('Pagination', () => {
  it('ẩn phân trang khi chỉ có một trang', () => {
    expect(
      renderPagination(1, { totalPages: 1, hasNextPage: false, hasPreviousPage: false }),
    ).toBe('');
  });

  it('giữ query khi tạo URL, đánh dấu trang hiện tại và giới hạn 7 số trang', () => {
    const html = renderPagination(5);

    expect(html).toContain('aria-label="Phân trang công thức"');
    expect(html).toContain('href="/recipes?page=4&amp;sort=-createdAt"');
    expect(html).toContain('href="/recipes?page=6&amp;sort=-createdAt"');
    expect(html).toContain('aria-current="page"');
    const linkedPages = Array.from(
      html.matchAll(/href="\/recipes\?page=(\d)&amp;sort=-createdAt"/g),
      ([, page]) => page,
    );
    expect(new Set(linkedPages).size).toBe(7);
  });

  it('vô hiệu hóa Previous ở đầu và Next ở cuối', () => {
    const firstPage = renderPagination(1, { hasPreviousPage: false });
    expect(firstPage).toContain('aria-disabled="true" aria-label="Trang trước"');
    expect(firstPage).not.toContain('href="/recipes?page=0');

    const lastPage = renderPagination(10, { hasNextPage: false });
    expect(lastPage).toContain('aria-disabled="true" aria-label="Trang sau"');
    expect(lastPage).not.toContain('href="/recipes?page=11');
  });
});
