import type { CategoryDto } from "@culinary/shared";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/ErrorState";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { ErrorStateInfo } from "@/lib/error-state";

interface CategorySidebarProps {
  categories: CategoryDto[];
  activeCategoryId?: string;
  error?: ErrorStateInfo;
  retryHref?: string;
}

export function CategorySidebar({
  categories,
  activeCategoryId,
  error,
  retryHref = "/",
}: CategorySidebarProps) {
  const content = error ? (
    <ErrorState
      error={error}
      title="Không thể tải danh mục"
      retryHref={retryHref}
      className="max-w-none px-4 py-8"
    />
  ) : categories.length === 0 ? (
    <ErrorState
      title="Chưa có danh mục"
      message="Danh mục công thức sẽ xuất hiện ở đây khi được tạo."
      className="max-w-none px-4 py-8"
    />
  ) : (
    <nav aria-label="Danh mục công thức">
      <ul className="space-y-1">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;

          return (
            <li key={category.id}>
              <Link
                href={`/recipes?categoryId=${encodeURIComponent(category.id)}`}
                aria-current={isActive ? "page" : undefined}
                className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary-soft text-foreground"
                    : "text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  }`}
                >
                  <CategoryIcon name={category.name} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {category.recipeCount} công thức
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <>
      <div className="lg:hidden">
        <details className="group rounded-2xl border border-border bg-card shadow-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-display text-lg [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
              Danh mục
            </span>
            <ChevronDown
              className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-border p-3">{content}</div>
        </details>
      </div>

      <aside className="hidden space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card lg:sticky lg:top-24 lg:block">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-lg">Danh mục</h2>
        </div>
        {content}
      </aside>
    </>
  );
}
