import type { CategoryDto } from "@culinary/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/ErrorState";
import { toErrorStateInfo, type ErrorStateInfo } from "@/lib/error-state";
import { CategoryVisual } from "./category-visual";
import { apiGet } from "@/lib/api";

export const metadata: Metadata = {
  title: "Danh mục món ăn",
  description:
    "Khám phá các công thức nấu ăn theo danh mục: món sáng, món nướng, súp, salad, bánh và nhiều hơn nữa.",
  alternates: {
    canonical: "/categories",
  },
  openGraph: {
    title: "Danh mục món ăn · Culinary Blog",
    description:
      "Khám phá các công thức nấu ăn theo danh mục: món sáng, món nướng, súp, salad, bánh và nhiều hơn nữa.",
    type: "website",
    url: "/categories",
  },
  twitter: {
    card: "summary_large_image",
    title: "Danh mục món ăn · Culinary Blog",
    description:
      "Khám phá các công thức nấu ăn theo danh mục: món sáng, món nướng, súp, salad, bánh và nhiều hơn nữa.",
  },
};

export const revalidate = 3600;

export default async function CategoriesPage() {
  const result = await loadCategories();
  const categories = result.categories;

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
        <CategoriesError error={result.error} />
      )}
    </div>
  );
}

async function loadCategories(): Promise<{
  categories: CategoryDto[] | null;
  error?: ErrorStateInfo;
}> {
  try {
    return {
      categories: await apiGet<CategoryDto[]>("/categories", undefined, {
        next: { revalidate },
      }),
    };
  } catch (error) {
    return { categories: null, error: toErrorStateInfo(error) };
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

function CategoriesError({ error }: { error?: ErrorStateInfo }) {
  return (
    <ErrorState
      error={error}
      title="Không thể tải danh mục"
      retryHref="/categories"
      className="mt-10"
    />
  );
}
