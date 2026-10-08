import type { CategoryDetailDto } from "@culinary/shared";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryVisual } from "../category-visual";
import { RecipeCard } from "@/components/RecipeCard";
import { ApiError, apiGet } from "@/lib/api";

export const metadata: Metadata = {
  title: "Danh mục công thức",
  description: "Khám phá các công thức đã được xuất bản trong từng danh mục của Culinary Blog.",
};

export const revalidate = 600;

const PAGE_SIZE = 12;
type SearchParams = Record<string, string | string[] | undefined>;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const page = normalizePage(firstValue(rawSearchParams.page));
  const detail = await loadCategory(slug, page);

  if (!detail) return <CategoryError slug={slug} />;

  const { category, recipes } = detail;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Link
        href="/categories"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Tất cả danh mục
      </Link>

      <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
        <CategoryVisual
          category={category}
          className="h-24 w-24 shrink-0 rounded-2xl"
          iconClassName="h-10 w-10"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Danh mục</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{category.name}</h1>
          {category.description && (
            <p className="mt-3 max-w-2xl text-muted-foreground">{category.description}</p>
          )}
          <p className="mt-3 text-sm font-semibold text-accent">
            {recipes.totalCount} công thức đã xuất bản
          </p>
        </div>
      </header>

      <section className="mt-12" aria-labelledby="category-recipes-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Công thức
            </p>
            <h2 id="category-recipes-heading" className="mt-2 font-display text-3xl">
              Món ngon trong danh mục này
            </h2>
          </div>
          {recipes.totalCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Trang {recipes.page} / {recipes.totalPages}
            </p>
          )}
        </div>

        {recipes.items.length > 0 ? (
          <>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.items.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
            <CategoryPagination slug={category.slug} meta={recipes} />
          </>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="font-display text-2xl">Chưa có công thức đã xuất bản</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Hãy quay lại sau để khám phá thêm món ngon trong danh mục này.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

async function loadCategory(slug: string, page: number): Promise<CategoryDetailDto | null> {
  try {
    return await apiGet<CategoryDetailDto>(
      `/categories/${encodeURIComponent(slug)}`,
      { page, pageSize: PAGE_SIZE },
      { next: { revalidate } },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return null;
  }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function CategoryPagination({
  slug,
  meta,
}: {
  slug: string;
  meta: CategoryDetailDto["recipes"];
}) {
  if (meta.totalPages <= 1) return null;

  return (
    <nav
      aria-label="Phân trang công thức trong danh mục"
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"
    >
      {meta.hasPreviousPage ? (
        <Link
          href={buildCategoryHref(slug, meta.page - 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Trang trước
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground opacity-50"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Trang trước
        </span>
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Trang <span className="font-semibold text-foreground">{meta.page}</span> / {meta.totalPages}
      </p>

      {meta.hasNextPage ? (
        <Link
          href={buildCategoryHref(slug, meta.page + 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          Trang sau
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground opacity-50"
        >
          Trang sau
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}

function buildCategoryHref(slug: string, page: number): string {
  return `/categories/${encodeURIComponent(slug)}?page=${page}`;
}

function CategoryError({ slug }: { slug: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Danh mục</p>
      <h1 className="mt-3 font-display text-3xl">Không thể tải danh mục</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        Máy chủ đang bận hoặc kết nối bị gián đoạn. Vui lòng thử tải lại trang.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={`/categories/${encodeURIComponent(slug)}`}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Tải lại
        </Link>
        <Link
          href="/categories"
          className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          Về danh mục
        </Link>
      </div>
    </div>
  );
}
