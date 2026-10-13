import type { RecipeDetailDto, RecipeImageDto, RecipeSummaryDto } from "@culinary/shared";

/**
 * PR #127 bổ sung các nested fields này vào shared type. Giữ view model trong route
 * để branch frontend vẫn có thể được kiểm tra trước khi PR API được merge vào main.
 */
export type RecipeDetail = Omit<
  RecipeDetailDto,
  "description" | "ingredients" | "steps" | "images" | "updatedAt"
> & {
  description: string | null;
  instructions: string;
  nutrition: RecipeNutrition;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  images: RecipeImage[];
  updatedAt: string | null;
};

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
  orderIndex: number;
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes: number | null;
  imageUrl: string | null;
}

export interface RecipeImage
  extends Omit<RecipeImageDto, Extract<keyof RecipeImageDto, "url" | "alt" | "isCover">> {
  originalUrl: string;
  mediumUrl: string | null;
  thumbnailUrl: string | null;
  altText: string | null;
  isPrimary: boolean;
  orderIndex: number;
}

export interface RecipeNutrition {
  calories: string | null;
  protein: string | null;
  carbohydrates: string | null;
  fat: string | null;
  fiber: string | null;
  sodium: string | null;
}

export type RelatedRecipe = RecipeSummaryDto;

export function getPrimaryImage(images: RecipeImage[]): RecipeImage | undefined {
  return images.find((image) => image.isPrimary) ?? images[0];
}

export function getImageUrl(
  image: RecipeImage | undefined,
  variant: "original" | "medium" | "thumbnail" = "medium",
): string | undefined {
  if (!image) return undefined;
  if (variant === "thumbnail") return image.thumbnailUrl ?? image.mediumUrl ?? image.originalUrl;
  if (variant === "original") return image.originalUrl;
  return image.mediumUrl ?? image.originalUrl;
}

export function formatIngredient(ingredient: RecipeIngredient): string {
  const amount = [ingredient.quantity, ingredient.unit].filter(Boolean).join(" ");
  const notes = ingredient.notes?.trim();
  return [amount, ingredient.name, notes ? `(${notes})` : ""].filter(Boolean).join(" ");
}

export function formatNutrition(value: string | null): string {
  return value?.trim() || "—";
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function totalTime(recipe: Pick<RecipeDetail, "prepTimeMinutes" | "cookTimeMinutes">): number {
  return recipe.prepTimeMinutes + recipe.cookTimeMinutes;
}
