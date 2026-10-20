import type { RecipeDetailDto } from "@culinary/shared";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  ApiError: class extends Error {
    constructor(readonly status: number) { super("API error"); }
  },
  apiGet: vi.fn(),
  apiGetPaged: vi.fn(),
}));
vi.mock("./RecipeDetailClient", () => ({ default: () => null }));

import { ApiError, apiGet, apiGetPaged } from "@/lib/api";
import RecipePage, { generateMetadata } from "./page";

const recipe: RecipeDetailDto = {
  id: "recipe-1",
  slug: "canh-chua",
  title: "Canh chua",
  excerpt: "Canh chua cá",
  description: "Canh chua cá miền Nam",
  coverImageUrl: null,
  status: "Published",
  difficulty: "Easy",
  prepTimeMinutes: 15,
  cookTimeMinutes: 30,
  servings: 4,
  author: { id: "author-1", displayName: "Trang", avatarUrl: null },
  category: { id: "category-1", name: "Món canh", slug: "mon-canh" },
  publishedAt: "2026-10-01T02:00:00.000Z",
  createdAt: "2026-09-30T02:00:00.000Z",
  updatedAt: null,
  instructions: "Chuẩn bị và nấu",
  nutrition: { calories: null, protein: null, carbohydrates: null, fat: null, fiber: null, sodium: null },
  ingredients: [{ id: "ingredient-1", name: "cá", quantity: "500", unit: "g", notes: null, orderIndex: 1 }],
  steps: [{ id: "step-1", stepNumber: 1, title: "Nấu", description: "Đun sôi nước dùng.", timerMinutes: null, imageUrl: null }],
  images: [{ id: "image-1", originalUrl: "https://cdn.example.test/canh-chua.jpg", mediumUrl: null, thumbnailUrl: null, altText: null, isPrimary: true, orderIndex: 0 }],
  rowVersion: 1,
};

beforeEach(() => {
  // Vitest chuyển JSX theo classic runtime; Next.js build dùng automatic runtime.
  vi.stubGlobal("React", React);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://culinary.example");
  vi.mocked(apiGetPaged).mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 4, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("recipe detail HTML and metadata", () => {
  it("xuất một JSON-LD và URL SEO tuyệt đối cho recipe Published", async () => {
    vi.mocked(apiGet).mockResolvedValue(recipe);
    const props = { params: Promise.resolve({ slug: recipe.slug }) };
    const html = renderToStaticMarkup(await RecipePage(props));
    const metadata = await generateMetadata(props);

    expect(html.match(/type="application\/ld\+json"/g)).toHaveLength(1);
    expect(html).toContain('"@type":"Recipe"');
    expect(metadata.alternates?.canonical).toBe("https://culinary.example/recipes/canh-chua");
    expect(metadata.openGraph?.url).toBe("https://culinary.example/recipes/canh-chua");
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["https://cdn.example.test/canh-chua.jpg"],
    });
  });

  it("lấy URL công khai từ AUTH_URL khi chưa cấu hình NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("AUTH_URL", "https://docker.example");
    vi.mocked(apiGet).mockResolvedValue(recipe);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "docker-recipe" }) });

    expect(metadata.alternates?.canonical).toBe("https://docker.example/recipes/canh-chua");
  });

  it.each(["Draft", "Archived"] as const)("không xuất JSON-LD và đặt noindex cho %s", async (status) => {
    vi.mocked(apiGet).mockResolvedValue({ ...recipe, status });
    const props = { params: Promise.resolve({ slug: `${recipe.slug}-${status}` }) };
    const html = renderToStaticMarkup(await RecipePage(props));
    const metadata = await generateMetadata(props);

    expect(html).not.toContain('type="application/ld+json"');
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });

  it("không xuất Recipe markup khi recipe Published thiếu ảnh", async () => {
    vi.mocked(apiGet).mockResolvedValue({ ...recipe, images: [] });
    const html = renderToStaticMarkup(await RecipePage({ params: Promise.resolve({ slug: "without-image" }) }));

    expect(html).not.toContain('type="application/ld+json"');
  });

  it("không xuất JSON-LD và đặt noindex khi API trả 403", async () => {
    vi.mocked(apiGet).mockRejectedValue(new ApiError(403, null));
    const props = { params: Promise.resolve({ slug: "private-recipe" }) };

    const html = renderToStaticMarkup(await RecipePage(props));
    const metadata = await generateMetadata(props);

    expect(html).not.toContain('type="application/ld+json"');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("trả 404, không xuất JSON-LD và đặt noindex khi API trả 404", async () => {
    vi.mocked(apiGet).mockRejectedValue(new ApiError(404, null));
    const props = { params: Promise.resolve({ slug: "missing-recipe" }) };

    await expect(RecipePage(props)).rejects.toThrow();
    const metadata = await generateMetadata(props);

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
