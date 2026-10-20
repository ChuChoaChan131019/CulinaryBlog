import type { PaginationMeta } from '@culinary/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface PaginationProps {
  meta: PaginationMeta;
  hrefForPage: (page: number) => string;
  label: string;
  className?: string;
}

export function Pagination({ meta, hrefForPage, label, className }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  const pageCount = Math.min(meta.totalPages, 7);
  const firstPage = Math.min(
    Math.max(meta.page - 3, 1),
    Math.max(meta.totalPages - pageCount + 1, 1),
  );
  const pages = Array.from({ length: pageCount }, (_, index) => firstPage + index);
  const linkClass =
    'grid h-10 min-w-10 place-items-center rounded-full border border-border bg-card px-3 text-sm font-semibold transition-colors hover:border-primary hover:text-primary';
  const disabledClass =
    'grid h-10 min-w-10 cursor-not-allowed place-items-center rounded-full border border-border px-3 text-sm text-muted-foreground opacity-40';

  return (
    <nav
      aria-label={label}
      className={`mt-10 flex flex-wrap items-center justify-center gap-2 ${className ?? ''}`.trim()}
    >
      {meta.hasPreviousPage ? (
        <Link href={hrefForPage(meta.page - 1)} className={linkClass} aria-label="Trang trước">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true" aria-label="Trang trước">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </span>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={hrefForPage(page)}
          aria-current={page === meta.page ? 'page' : undefined}
          className={`${linkClass} ${page === meta.page ? 'bg-primary text-primary-foreground hover:text-primary-foreground' : 'text-muted-foreground'}`}
        >
          {page}
        </Link>
      ))}

      {meta.hasNextPage ? (
        <Link href={hrefForPage(meta.page + 1)} className={linkClass} aria-label="Trang sau">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true" aria-label="Trang sau">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}

      <span className="sr-only" aria-live="polite">
        Trang {meta.page} / {meta.totalPages}
      </span>
    </nav>
  );
}
