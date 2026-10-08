import type {
  CategoryDto,
  PagedResponse,
  RecipeSearchResultDto,
} from "@culinary/shared";
import { ChevronLeft, ChevronRight, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RecipeCard } from "@/components/RecipeCard";
import { apiGet, apiGetPaged } from "@/lib/api";
import {
  buildSearchHref,
  normalizeSearchQuery,
  PAGE_SIZE,
  type SearchPageQuery,
  type SearchParams,
} from "./helpers";

export const metadata: Metadata = {
  title: "Tìm kiếm công thức",
  description: "Tìm kiếm công thức nấu ăn bằng từ khóa, danh mục, độ khó và thời gian nấu.",
};

interface SearchPageProps {
  searchParams: Promise<SearchParams>;
}

function emptyResult(page: number): PagedResponse<RecipeSearchResultDto> {
  return {
    data: [],
    meta: {
      totalCount: 0,
      page,
      pageSize: PAGE_SIZE,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = normalizeSearchQuery(params);
  const result = await loadSearch(query);
  const hasActiveFilters = Boolean(
    query.categoryId ||
      query.difficulty ||
      query.maxCookTime !== undefined ||
      query.minServings !== undefined ||
      query.sort !== "relevance",
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tìm kiếm</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Tìm món ăn tiếp theo</h1>
        <p className="mt-4 text-muted-foreground">
          Tìm theo tên hoặc mô tả, sau đó thu hẹp kết quả bằng danh mục, độ khó và thời gian nấu.
        </p>
      </header>

      <form action="/search" className="relative mt-8" role="search">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          placeholder="Thử “pho bo”, “súp” hoặc “bánh mì”"
          aria-label="Tìm kiếm công thức"
          className="field py-3.5 pl-11 pr-28"
        />
        <SearchQueryHiddenFields query={query} includeQuery={false} includeFilters />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Tìm kiếm
        </button>
      </form>

      <div className="mt-10 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SearchFilters
          query={query}
          categories={result.categories}
          categoriesError={result.categoriesError}
        />

        <section>
          {query.termState === "empty" ? (
            <SearchPrompt message="Nhập ít nhất hai ký tự để bắt đầu tìm kiếm." />
          ) : query.termState === "tooShort" ? (
            <SearchPrompt message="Từ khóa cần có ít nhất hai ký tự." />
          ) : query.termState === "tooLong" ? (
            <SearchPrompt message="Từ khóa không được dài quá 200 ký tự." />
          ) : query.termState === "invalid" ? (
            <SearchPrompt message="Từ khóa phải có ít nhất một chữ cái hoặc chữ số." />
          ) : result.error ? (
            <SearchError />
          ) : (
            <SearchResults query={query} result={result.recipes} hasActiveFilters={hasActiveFilters} />
          )}
        </section>
      </div>
    </main>
  );
}

async function loadSearch(query: SearchPageQuery) {
  const categoriesPromise = apiGet<CategoryDto[]>("/categories", undefined, { cache: "no-store" });
  const recipesPromise =
    query.termState === "valid"
      ? apiGetPaged<RecipeSearchResultDto>(
          "/recipes/search",
          {
            q: query.q,
            page: query.page,
            pageSize: PAGE_SIZE,
            categoryId: query.categoryId,
            difficulty: query.difficulty,
            maxCookTime: query.maxCookTime,
            minServings: query.minServings,
            sort: query.sort,
          },
          { cache: "no-store" },
        )
      : Promise.resolve(emptyResult(query.page));

  const [categoriesResult, recipesResult] = await Promise.allSettled([
    categoriesPromise,
    recipesPromise,
  ]);

  return {
    categories: categoriesResult.status === "fulfilled" ? categoriesResult.value : [],
    recipes: recipesResult.status === "fulfilled" ? recipesResult.value : emptyResult(query.page),
    error: recipesResult.status === "rejected",
    categoriesError: categoriesResult.status === "rejected",
  };
}

function SearchQueryHiddenFields({
  query,
  includeQuery = true,
  includeFilters = false,
}: {
  query: SearchPageQuery;
  includeQuery?: boolean;
  includeFilters?: boolean;
}) {
  return (
    <>
      {includeQuery && query.q && <input type="hidden" name="q" value={query.q} />}
      {includeFilters && query.categoryId && (
        <input type="hidden" name="categoryId" value={query.categoryId} />
      )}
      {includeFilters && query.difficulty && (
        <input type="hidden" name="difficulty" value={query.difficulty} />
      )}
      {includeFilters && query.maxCookTime !== undefined && (
        <input type="hidden" name="maxCookTime" value={query.maxCookTime} />
      )}
      {includeFilters && query.minServings !== undefined && (
        <input type="hidden" name="minServings" value={query.minServings} />
      )}
      {includeFilters && query.sort !== "relevance" && (
        <input type="hidden" name="sort" value={query.sort} />
      )}
    </>
  );
}

function SearchFilters({
  query,
  categories,
  categoriesError,
}: {
  query: SearchPageQuery;
  categories: CategoryDto[];
  categoriesError: boolean;
}) {
  const activeFilters = [
    query.categoryId,
    query.difficulty,
    query.maxCookTime,
    query.minServings,
    query.sort !== "relevance" ? query.sort : undefined,
  ].filter((value) => value !== undefined).length;

  return (
    <aside className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-card lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Bộ lọc
        </h2>
        {activeFilters > 0 && (
          <Link href={buildSearchHref({ q: query.q, sort: "relevance" })} className="text-xs font-semibold text-primary">
            Xóa
          </Link>
        )}
      </div>
      {categoriesError && (
        <p className="text-xs text-muted-foreground" role="status">
          Không thể tải danh mục; bạn vẫn có thể tìm kiếm theo từ khóa.
        </p>
      )}

      <form action="/search" className="space-y-6">
        <SearchQueryHiddenFields query={query} />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Danh mục</span>
          <select name="categoryId" className="field" defaultValue={query.categoryId ?? ""}>
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Độ khó</span>
          <select name="difficulty" className="field" defaultValue={query.difficulty ?? ""}>
            <option value="">Tất cả độ khó</option>
            <option value="Easy">Dễ</option>
            <option value="Medium">Trung bình</option>
            <option value="Hard">Khó</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Thời gian nấu tối đa</span>
          <select name="maxCookTime" className="field" defaultValue={query.maxCookTime?.toString() ?? ""}>
            <option value="">Không giới hạn</option>
            <option value="30">30 phút</option>
            <option value="60">60 phút</option>
            <option value="90">90 phút</option>
            <option value="120">120 phút</option>
            <option value="180">180 phút</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Khẩu phần tối thiểu</span>
          <input
            type="number"
            name="minServings"
            min={1}
            max={100}
            defaultValue={query.minServings}
            placeholder="Bất kỳ"
            className="field"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Sắp xếp</span>
          <select name="sort" className="field" defaultValue={query.sort}>
            <option value="relevance">Độ liên quan</option>
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
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Áp dụng bộ lọc
        </button>
      </form>
    </aside>
  );
}

function SearchResults({
  query,
  result,
  hasActiveFilters,
}: {
  query: SearchPageQuery;
  result: PagedResponse<RecipeSearchResultDto>;
  hasActiveFilters: boolean;
}) {
  if (result.data.length === 0) {
    return (
      <div className="mt-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <p className="font-display text-xl">Không tìm thấy công thức phù hợp</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Hãy thử từ khóa khác hoặc nới lỏng các bộ lọc.
        </p>
        {hasActiveFilters && (
          <Link
            href={buildSearchHref({ q: query.q, sort: "relevance" })}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Xóa bộ lọc
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {result.meta.totalCount} công thức cho “{query.q}”
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {result.data.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
      <SearchPagination query={query} meta={result.meta} />
    </>
  );
}

function SearchPagination({
  query,
  meta,
}: {
  query: SearchPageQuery;
  meta: PagedResponse<RecipeSearchResultDto>["meta"];
}) {
  if (meta.totalPages <= 1) return null;

  const pageCount = Math.min(meta.totalPages, 7);
  const firstPage = Math.min(
    Math.max(meta.page - 3, 1),
    Math.max(meta.totalPages - pageCount + 1, 1),
  );
  const pages = Array.from({ length: pageCount }, (_, index) => firstPage + index);
  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang tìm kiếm">
      {meta.hasPreviousPage ? (
        <Link
          href={buildSearchHref(query, meta.page - 1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-full border border-border opacity-40" aria-hidden>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={buildSearchHref(query, page)}
          aria-current={page === meta.page ? "page" : undefined}
          className={`grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-semibold ${
            page === meta.page
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {page}
        </Link>
      ))}

      {meta.hasNextPage ? (
        <Link
          href={buildSearchHref(query, meta.page + 1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-full border border-border opacity-40" aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

function SearchPrompt({ message }: { message: string }) {
  return (
    <div className="mt-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <p className="font-display text-xl">Bắt đầu tìm kiếm công thức</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function SearchError() {
  return (
    <div role="alert" className="mt-2 rounded-2xl border border-destructive/30 bg-card px-6 py-16 text-center">
      <p className="font-display text-xl">Không thể tải kết quả tìm kiếm</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Máy chủ đang bận hoặc kết nối bị gián đoạn. Vui lòng thử lại.
      </p>
    </div>
  );
}
