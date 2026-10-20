import type { RecipeDetailDto } from "@culinary/shared";
import { formatIngredient, getPrimaryImage } from "./recipe-detail.helpers";

function publicImageUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;

    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      !host.includes(".")
    ) return undefined;
    if (host === "::1" || host === "0.0.0.0") return undefined;

    const ipv4 = host.split(".").map(Number);
    if (ipv4.length === 4 && ipv4.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
      if (
        ipv4[0] === 10 ||
        ipv4[0] === 127 ||
        ipv4[0] === 0 ||
        (ipv4[0] === 169 && ipv4[1] === 254) ||
        (ipv4[0] === 192 && ipv4[1] === 168) ||
        (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31)
      ) return undefined;
    }

    return url.href;
  } catch {
    return undefined;
  }
}

export function getRecipeImageUrl(recipe: Pick<RecipeDetailDto, "images">): string | undefined {
  const primary = getPrimaryImage(recipe.images);
  return [primary, ...recipe.images.filter((image) => image.id !== primary?.id)]
    .flatMap((image) => [image?.originalUrl, image?.mediumUrl])
    .map(publicImageUrl)
    .find((url) => url !== undefined);
}

function duration(minutes: number): string {
  return `PT${minutes}M`;
}

function nutritionInformation(nutrition: RecipeDetailDto["nutrition"]) {
  const fields = [
    ["calories", nutrition.calories, "calories"],
    ["proteinContent", nutrition.protein, "g"],
    ["carbohydrateContent", nutrition.carbohydrates, "g"],
    ["fatContent", nutrition.fat, "g"],
    ["fiberContent", nutrition.fiber, "g"],
    ["sodiumContent", nutrition.sodium, "mg"],
  ] as const;
  const values: Record<string, string> = {};

  for (const [key, rawValue, unit] of fields) {
    if (rawValue === null || rawValue.trim() === "") continue;
    const value = Number(rawValue);
    if (Number.isFinite(value) && value >= 0) values[key] = `${value} ${unit}`;
  }

  return Object.keys(values).length > 0
    ? { "@type": "NutritionInformation" as const, ...values }
    : undefined;
}

export function buildRecipeJsonLd(recipe: RecipeDetailDto, canonicalUrl: string) {
  if (recipe.status !== "Published") return null;

  // Google yêu cầu ảnh món ăn thật cho Recipe rich result; không dùng ảnh giữ chỗ.
  const image = getRecipeImageUrl(recipe);
  if (!image) return null;

  const nutrition = nutritionInformation(recipe.nutrition);
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    url: canonicalUrl,
    name: recipe.title,
    description: recipe.description?.trim() || recipe.excerpt?.trim() || undefined,
    image: [image],
    author: { "@type": "Person", name: recipe.author.displayName },
    ...(recipe.publishedAt ? { datePublished: recipe.publishedAt } : {}),
    prepTime: duration(recipe.prepTimeMinutes),
    cookTime: duration(recipe.cookTimeMinutes),
    totalTime: duration(recipe.prepTimeMinutes + recipe.cookTimeMinutes),
    recipeYield: recipe.servings,
    recipeIngredient: [...recipe.ingredients]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(formatIngredient),
    recipeInstructions: [...recipe.steps]
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((step) => ({
        "@type": "HowToStep" as const,
        name: step.title,
        text: step.description,
      })),
    recipeCategory: recipe.category.name,
    ...(nutrition ? { nutrition } : {}),
  };
}

export function serializeJsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
