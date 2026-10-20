import type { CategoryDetailDto } from "@culinary/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ErrorState";
import { CategoryVisual } from "../category-visual";
import { RecipeCard } from "@/components/RecipeCard";
import { ApiError, apiGet } from "@/lib/api";
import { toErrorStateInfo, type ErrorStateInfo } from "@/lib/error-state";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const canonical = `/categories/${encodeURIComponent(slug)}`;
  return {
    title: "Danh mục công thức",
    description: "Khám phá các công thức đã được xuất bản trong từng danh mục của Culinary Blog.",
    alternates: {
      canonical,
    },
    openGraph: {
      title: "Danh mục công thức · Culinary Blog",
      description: "Khám phá các công thức đã được xuất bản trong từng danh mục của Culinary Blog.",
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: "Danh mục công thức · Culinary Blog",
      description: "Khám phá các công thức đã được xuất bản trong từng danh mục của Culinary Blog.",
    },
  };
}

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
  const result = await loadCategory(slug, page);

  if (!result.detail) return <CategoryError slug={slug} error={result.error} />;

  const { category, recipes } = result.detail;

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

async function loadCategory(
  slug: string,
  page: number,
): Promise<
  | { detail: CategoryDetailDto; error?: never }
  | { detail: null; error: ErrorStateInfo }
> {
  try {
    return {
      detail: await apiGet<CategoryDetailDto>(
        `/categories/${encodeURIComponent(slug)}`,
        { page, pageSize: PAGE_SIZE },
        { next: { revalidate } },
      ),
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return { detail: null, error: toErrorStateInfo(error) };
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

function CategoryError({ slug, error }: { slug: string; error: ErrorStateInfo }) {
  return (
    <ErrorState
      error={error}
      title="Không thể tải danh mục"
      retryHref={`/categories/${encodeURIComponent(slug)}`}
      homeHref="/categories"
      homeLabel="Về danh mục"
      className="mx-auto mt-16 max-w-3xl px-4 sm:px-6"
    />
  );
}
