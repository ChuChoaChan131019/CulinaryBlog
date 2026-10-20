import type { RecipeSummaryDto } from "@culinary/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ApiError, apiGet, apiGetPaged } from "@/lib/api";
import RecipeDetailClient from "./RecipeDetailClient";
import type { RecipeDetail, RelatedRecipe } from "./recipe-detail.helpers";
import { buildRecipeJsonLd, getRecipeImageUrl, serializeJsonLd } from "./recipe-json-ld";

interface RecipePageProps {
  params: Promise<{ slug: string }>;
}

type PublicRecipeResult =
  | { kind: "ok"; recipe: RecipeDetail }
  | { kind: "forbidden" }
  | { kind: "not-found" }
  | { kind: "error" };

const loadPublicRecipe = cache(async (slug: string): Promise<PublicRecipeResult> => {
  try {
    return {
      kind: "ok",
      recipe: await apiGet<RecipeDetail>(`/recipes/${encodeURIComponent(slug)}`, undefined, {
        cache: "no-store",
      }),
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { kind: "not-found" };
    if (error instanceof ApiError && error.status === 403) return { kind: "forbidden" };
    return { kind: "error" };
  }
});

function recipeUrl(slug: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || process.env.PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(`/recipes/${encodeURIComponent(slug)}`, siteUrl).href;
}

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPublicRecipe(slug);

  if (result.kind !== "ok") {
    return {
      title: { absolute: result.kind === "forbidden" ? "Công thức riêng tư | Culinary Blog" : "Không tìm thấy công thức | Culinary Blog" },
      description: "Công thức này không khả dụng trên Culinary Blog.",
      robots: { index: false, follow: false },
    };
  }

  const { recipe } = result;
  const description = (recipe.description?.trim() || recipe.excerpt?.trim() || "Công thức nấu ăn trên Culinary Blog.")
    .replace(/\s+/g, " ")
    .slice(0, 160);
  const titleSuffix = " | Culinary Blog";
  const title = `${recipe.title.trim().slice(0, 60 - titleSuffix.length).trimEnd()}${titleSuffix}`;
  const image = getRecipeImageUrl(recipe);
  const url = recipeUrl(recipe.slug);

  return {
    title: { absolute: title },
    description,
    ...(recipe.status === "Published" ? { alternates: { canonical: url } } : {}),
    openGraph: {
      title,
      description,
      type: "article",
      url,
      images: image ? [{ url: image, alt: recipe.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
    ...(recipe.status === "Published" ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug } = await params;
  const result = await loadPublicRecipe(slug);

  if (result.kind === "not-found") notFound();

  if (result.kind === "error") return <RecipeDetailError slug={slug} />;

  const initialRecipe = result.kind === "ok" ? result.recipe : null;
  const initialRelated = initialRecipe ? await loadRelatedRecipes(initialRecipe) : [];
  const jsonLd = initialRecipe ? buildRecipeJsonLd(initialRecipe, recipeUrl(initialRecipe.slug)) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
      <RecipeDetailClient
        slug={slug}
        initialRecipe={initialRecipe}
        initialRelated={initialRelated}
        requiresAuth={result.kind === "forbidden"}
      />
    </>
  );
}

async function loadRelatedRecipes(recipe: RecipeDetail): Promise<RelatedRecipe[]> {
  try {
    const result = await apiGetPaged<RecipeSummaryDto>(
      "/recipes",
      { categoryId: recipe.category.id, pageSize: 4, sort: "-createdAt" },
      { cache: "no-store" },
    );
    return result.data.filter((item) => item.slug !== recipe.slug).slice(0, 3);
  } catch {
    return [];
  }
}

function RecipeDetailError({ slug }: { slug: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Công thức</p>
      <h1 className="mt-3 font-display text-3xl">Không thể tải công thức</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        Máy chủ đang bận hoặc kết nối bị gián đoạn. Vui lòng thử lại.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={`/recipes/${encodeURIComponent(slug)}`}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Tải lại
        </Link>
        <Link
          href="/recipes"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          Về danh sách
        </Link>
      </div>
    </div>
  );
}
