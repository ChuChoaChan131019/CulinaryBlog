import type { RecipeDetailDto } from "@culinary/shared";
import { describe, expect, it } from "vitest";
import { buildRecipeJsonLd, serializeJsonLd } from "./recipe-json-ld";

const recipe: RecipeDetailDto = {
  id: "recipe-1",
  slug: "canh-chua",
  title: "Canh chua",
  excerpt: "Canh chua cá",
  description: "Canh chua cá miền Nam",
  coverImageUrl: "https://cdn.example.test/canh-chua.jpg",
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
  nutrition: {
    calories: "120.00",
    protein: "12.50",
    carbohydrates: null,
    fat: null,
    fiber: null,
    sodium: "300.00",
  },
  ingredients: [
    { id: "2", name: "cà chua", quantity: "2", unit: "quả", notes: null, orderIndex: 2 },
    { id: "1", name: "cá", quantity: "500", unit: "g", notes: null, orderIndex: 1 },
  ],
  steps: [
    { id: "2", stepNumber: 2, title: "Nấu", description: "Đun sôi nước dùng.", timerMinutes: null, imageUrl: null },
    { id: "1", stepNumber: 1, title: "Sơ chế", description: "Rửa sạch cá.", timerMinutes: null, imageUrl: null },
  ],
  images: [
    { id: "image-1", originalUrl: "https://cdn.example.test/canh-chua.jpg", mediumUrl: null, thumbnailUrl: null, altText: "Canh chua", isPrimary: true, orderIndex: 0 },
  ],
  rowVersion: 1,
};

const canonicalUrl = "https://culinary.example/recipes/canh-chua";

describe("Recipe JSON-LD", () => {
  it("dùng dữ liệu thật, sắp xếp nguyên liệu và bước, đổi phút sang ISO 8601", () => {
    const result = buildRecipeJsonLd(recipe, canonicalUrl);

    expect(result).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Recipe",
      url: canonicalUrl,
      name: "Canh chua",
      image: ["https://cdn.example.test/canh-chua.jpg"],
      author: { "@type": "Person", name: "Trang" },
      datePublished: "2026-10-01T02:00:00.000Z",
      prepTime: "PT15M",
      cookTime: "PT30M",
      totalTime: "PT45M",
      recipeYield: 4,
      recipeIngredient: ["500 g cá", "2 quả cà chua"],
      recipeInstructions: [
        { "@type": "HowToStep", name: "Sơ chế", text: "Rửa sạch cá." },
        { "@type": "HowToStep", name: "Nấu", text: "Đun sôi nước dùng." },
      ],
      recipeCategory: "Món canh",
      nutrition: {
        "@type": "NutritionInformation",
        calories: "120 calories",
        proteinContent: "12.5 g",
        sodiumContent: "300 mg",
      },
    });
    expect(result?.nutrition).not.toHaveProperty("carbohydrateContent");
  });

  it("bỏ nutrition khi tất cả giá trị rỗng, không xuất giá trị null", () => {
    const withoutNutrition = {
      ...recipe,
      nutrition: {
        calories: null,
        protein: null,
        carbohydrates: null,
        fat: null,
        fiber: null,
        sodium: null,
      },
    };
    const result = buildRecipeJsonLd(withoutNutrition, canonicalUrl);

    expect(result).not.toHaveProperty("nutrition");
    expect(JSON.stringify(result)).not.toContain(":null");
  });

  it.each(["Draft", "Archived"] as const)("không xuất dữ liệu cho %s", (status) => {
    expect(buildRecipeJsonLd({ ...recipe, status }, canonicalUrl)).toBeNull();
  });

  it("không dùng ảnh giữ chỗ hoặc URL không hợp lệ", () => {
    expect(buildRecipeJsonLd({ ...recipe, images: [] }, canonicalUrl)).toBeNull();
    expect(buildRecipeJsonLd({ ...recipe, images: [{ ...recipe.images[0], originalUrl: "/local.jpg" }] }, canonicalUrl)).toBeNull();
  });

  it.each([
    "http://localhost:9000/recipe.jpg",
    "http://minio:9000/recipe.jpg",
    "http://127.0.0.1:9000/recipe.jpg",
    "http://192.168.1.10/recipe.jpg",
  ])("không xuất ảnh nội bộ %s cho Google", (originalUrl) => {
    expect(buildRecipeJsonLd({ ...recipe, images: [{ ...recipe.images[0], originalUrl }] }, canonicalUrl)).toBeNull();
  });

  it("dùng biến thể công khai khi URL ảnh gốc là địa chỉ nội bộ", () => {
    const result = buildRecipeJsonLd({
      ...recipe,
      images: [{ ...recipe.images[0], originalUrl: "http://minio:9000/recipe.jpg", mediumUrl: "https://cdn.example.test/recipe-medium.jpg" }],
    }, canonicalUrl);

    expect(result?.image).toEqual(["https://cdn.example.test/recipe-medium.jpg"]);
  });

  it("dùng ảnh hợp lệ tiếp theo và giữ thời gian 0 ở định dạng ISO 8601", () => {
    const result = buildRecipeJsonLd({
      ...recipe,
      prepTimeMinutes: 0,
      images: [
        { ...recipe.images[0], originalUrl: "not-a-url" },
        { ...recipe.images[0], id: "image-2", originalUrl: "https://cdn.example.test/second.jpg", isPrimary: false },
      ],
    }, canonicalUrl);

    expect(result?.image).toEqual(["https://cdn.example.test/second.jpg"]);
    expect(result?.prepTime).toBe("PT0M");
    expect(result?.totalTime).toBe("PT30M");
  });

  it("escape chuỗi do người dùng nhập trước khi chèn vào script", () => {
    const result = buildRecipeJsonLd({ ...recipe, title: "</script><script>alert(1)</script>" }, canonicalUrl);
    const serialized = serializeJsonLd(result!);

    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized).name).toBe("</script><script>alert(1)</script>");
  });
});
