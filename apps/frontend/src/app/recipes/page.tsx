import type { CategoryDto, RecipeSummaryDto } from "@culinary/shared";
import { ChevronLeft, ChevronRight, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RecipeCard } from "@/components/RecipeCard";
import { apiGet, apiGetPaged } from "@/lib/api";

export const metadata: Metadata = {
  title: "Tất cả công thức",
  description:
    "Khám phá, lọc theo danh mục và sắp xếp các công thức nấu ăn đã được chia sẻ trên Culinary Blog.",
};

const PAGE_SIZE = 12;
const DEFAULT_SORT = "-createdAt";
const SORT_VALUES = [
  "-createdAt",
  "createdAt",
  "title",
  "-title",
  "cookTime",
  "-cookTime",
] as const;

type SortValue = (typeof SORT_VALUES)[number];
type SearchParams = Record<string, string | string[] | undefined>;

interface RecipesPageProps {
  searchParams: Promise<SearchParams>;
}

interface RecipeListQuery {
  page: number;
  categoryId?: string;
  sort: SortValue;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeSort(value: string | undefined): SortValue {
  return SORT_VALUES.includes(value as SortValue) ? (value as SortValue) : DEFAULT_SORT;
}

function buildRecipesHref(query: RecipeListQuery, page: number): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.sort !== DEFAULT_SORT) params.set("sort", query.sort);
  const search = params.toString();
  return search ? `/recipes?${search}` : "/recipes";
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const categoryId = firstValue(params.categoryId)?.trim() || undefined;
  const query: RecipeListQuery = {
    page: normalizePage(firstValue(params.page)),
    categoryId,
    sort: normalizeSort(firstValue(params.sort)),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Kho công thức
        </p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Mọi công thức, chọn thật dễ</h1>
        <p className="mt-4 text-muted-foreground">
          Lọc theo danh mục, sắp xếp theo nhu cầu và tìm món phù hợp cho bữa ăn tiếp theo của
          bạn.
        </p>
      </header>

      <Suspense key={`${query.page}-${query.categoryId ?? "all"}-${query.sort}`} fallback={<RecipesLoading />}>
        <RecipeList query={query} />
      </Suspense>
    </main>
  );
}

async function RecipeList({ query }: { query: RecipeListQuery }) {
  const result = await loadRecipeList(query);
  if (!result) return <RecipesError />;

  const { categories, recipes } = result;
  const hasFilters = Boolean(query.categoryId) || query.sort !== DEFAULT_SORT;

  return (
    <>
      <RecipeFilters categories={categories} query={query} hasFilters={hasFilters} />

      <p className="mt-6 text-sm text-muted-foreground">
        {recipes.meta.totalCount} công thức
        {recipes.data.length > 0 && (
          <span>
            {" "}
            · Đang hiển thị {(recipes.meta.page - 1) * recipes.meta.pageSize + 1}–
            {Math.min(recipes.meta.page * recipes.meta.pageSize, recipes.meta.totalCount)}
          </span>
        )}
      </p>

      {recipes.data.length > 0 ? (
        <>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.data.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
          <RecipePagination query={query} meta={recipes.meta} />
        </>
      ) : (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-display text-2xl">Chưa tìm thấy công thức phù hợp</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {hasFilters
              ? "Hãy thử một danh mục hoặc cách sắp xếp khác."
              : "Chưa có công thức nào được đăng. Hãy quay lại sau nhé."}
          </p>
          {hasFilters && (
            <Link
              href="/recipes"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Xóa bộ lọc
            </Link>
          )}
        </div>
      )}
    </>
  );
}

async function loadRecipeList(query: RecipeListQuery) {
  try {
    const [categories, recipes] = await Promise.all([
      apiGet<CategoryDto[]>("/categories", undefined, { cache: "no-store" }),
      apiGetPaged<RecipeSummaryDto>(
        "/recipes",
        {
          page: query.page,
          pageSize: PAGE_SIZE,
          categoryId: query.categoryId,
          sort: query.sort,
        },
        { cache: "no-store" },
      ),
    ]);

    return { categories, recipes };
  } catch {
    return null;
  }
}

function RecipeFilters({
  categories,
  query,
  hasFilters,
}: {
  categories: CategoryDto[];
  query: RecipeListQuery;
  hasFilters: boolean;
}) {
  return (
    <form
      action="/recipes"
      className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end"
    >
      <label className="grid gap-2 text-sm font-medium" htmlFor="recipe-category">
        Danh mục
        <select
          id="recipe-category"
          name="categoryId"
          defaultValue={query.categoryId ?? ""}
          className="field"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.recipeCount})
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium" htmlFor="recipe-sort">
        Sắp xếp
        <select id="recipe-sort" name="sort" defaultValue={query.sort} className="field">
          <option value="-createdAt">Mới nhất</option>
          <option value="createdAt">Cũ nhất</option>
          <option value="title">Tên A–Z</option>
          <option value="-title">Tên Z–A</option>
          <option value="cookTime">Thời gian nấu tăng dần</option>
          <option value="-cookTime">Thời gian nấu giảm dần</option>
        </select>
      </label>

      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Áp dụng
      </button>

      {hasFilters ? (
        <Link
          href="/recipes"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Xóa bộ lọc
        </Link>
      ) : (
        <span className="hidden lg:block" aria-hidden />
      )}
    </form>
  );
}

function RecipePagination({
  query,
  meta,
}: {
  query: RecipeListQuery;
  meta: {
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}) {
  if (meta.totalPages <= 1) return null;

  return (
    <nav
      aria-label="Phân trang công thức"
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"
    >
      {meta.hasPreviousPage ? (
        <Link
          href={buildRecipesHref(query, meta.page - 1)}
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
          href={buildRecipesHref(query, meta.page + 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          Trang sau
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground opacity-50"
        >
          Trang sau
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}

function RecipesLoading() {
  return (
    <div className="mt-8" aria-busy="true" aria-label="Đang tải danh sách công thức">
      <span className="sr-only">Đang tải danh sách công thức…</span>
      <div className="grid animate-pulse gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <div className="h-16 rounded-xl bg-secondary" />
        <div className="h-16 rounded-xl bg-secondary" />
        <div className="h-11 rounded-xl bg-secondary lg:w-28" />
        <div className="hidden h-11 rounded-xl bg-secondary lg:block lg:w-28" />
      </div>
      <div className="mt-10 grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="aspect-[4/3] bg-secondary" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-24 rounded bg-secondary" />
              <div className="h-6 w-4/5 rounded bg-secondary" />
              <div className="h-4 w-full rounded bg-secondary" />
              <div className="h-4 w-2/3 rounded bg-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecipesError() {
  return (
    <div
      role="alert"
      className="mt-10 rounded-2xl border border-destructive/30 bg-card px-6 py-12 text-center"
    >
      <p className="font-display text-2xl">Không thể tải danh sách công thức</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Máy chủ đang bận hoặc kết nối bị gián đoạn. Vui lòng thử tải lại trang.
      </p>
      <Link
        href="/recipes"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Tải lại
      </Link>
    </div>
  );
}
