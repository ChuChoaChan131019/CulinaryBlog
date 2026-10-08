import type { CategoryDto } from "@culinary/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { CategoryVisual } from "./category-visual";
import { apiGet } from "@/lib/api";

export const metadata: Metadata = {
  title: "Danh mục món ăn",
  description:
    "Khám phá các công thức nấu ăn theo danh mục: món sáng, món nướng, súp, salad, bánh và nhiều hơn nữa.",
};

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await loadCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Khám phá</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Nấu ăn theo danh mục</h1>
        <p className="mt-4 text-muted-foreground">
          Chọn một danh mục để tìm những công thức đã được chia sẻ và xuất bản trên Culinary Blog.
        </p>
      </header>

      {categories ? (
        categories.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${encodeURIComponent(category.slug)}`}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <CategoryVisual
                  category={category}
                  className="h-12 w-12 rounded-xl transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                />
                <h2 className="mt-5 font-display text-xl">{category.name}</h2>
                {category.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}
                <p className="mt-4 text-sm font-semibold text-accent">
                  {category.recipeCount} công thức
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyCategories />
        )
      ) : (
        <CategoriesError />
      )}
    </div>
  );
}

async function loadCategories(): Promise<CategoryDto[] | null> {
  try {
    return await apiGet<CategoryDto[]>("/categories", undefined, {
      next: { revalidate },
    });
  } catch {
    return null;
  }
}

function EmptyCategories() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <p className="font-display text-2xl">Chưa có danh mục nào</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Các danh mục công thức sẽ xuất hiện ở đây khi được tạo.
      </p>
    </div>
  );
}

function CategoriesError() {
  return (
    <div
      role="alert"
      className="mt-10 rounded-2xl border border-destructive/30 bg-card px-6 py-12 text-center"
    >
      <p className="font-display text-2xl">Không thể tải danh mục</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Máy chủ đang bận hoặc kết nối bị gián đoạn. Vui lòng thử tải lại trang.
      </p>
      <Link
        href="/categories"
        className="mt-5 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Tải lại
      </Link>
    </div>
  );
}
