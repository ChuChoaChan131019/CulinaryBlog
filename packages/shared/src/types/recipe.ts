import type { UserProfileDto } from "./auth";
import type { CategoryDto } from "./category";

export type RecipeStatus = "Draft" | "Published" | "Archived";
export type DifficultyLevel = "Easy" | "Medium" | "Hard";

/** Payload tạo recipe, dùng chung giữa form App Router và REST API. */
export interface CreateRecipeRequest {
  title: string;
  description: string;
  categoryId: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: DifficultyLevel;
  instructions: string;
  ingredients: CreateRecipeIngredientRequest[];
  steps: CreateRecipeStepRequest[];
}

export interface CreateRecipeIngredientRequest {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  orderIndex: number;
}

export interface CreateRecipeStepRequest {
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes?: number;
  imageUrl?: string;
}

export interface RecipeIngredientDto {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
  orderIndex: number;
}

export interface RecipeStepDto {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes: number | null;
  imageUrl: string | null;
}

export interface RecipeImageDto {
  id: string;
  originalUrl: string;
  mediumUrl: string | null;
  thumbnailUrl: string | null;
  altText: string | null;
  isPrimary: boolean;
  orderIndex: number;
}

export interface RecipeNutritionDto {
  calories: string | null;
  protein: string | null;
  carbohydrates: string | null;
  fat: string | null;
  fiber: string | null;
  sodium: string | null;
}

export interface RecipeSummaryDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: RecipeStatus;
  difficulty: DifficultyLevel;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  author: Pick<UserProfileDto, "id" | "displayName" | "avatarUrl">;
  category: Pick<CategoryDto, "id" | "name" | "slug">;
  publishedAt: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface RecipeSearchResultDto extends RecipeSummaryDto {
  relevanceScore: number;
}

export interface RecipeDetailDto extends RecipeSummaryDto {
  description: string | null;
  instructions: string;
  nutrition: RecipeNutritionDto;
  ingredients: RecipeIngredientDto[];
  steps: RecipeStepDto[];
  images: RecipeImageDto[];
  rowVersion: number;
  updatedAt: string | null;
}

/** Shape dùng cho form tạo/sửa recipe, khớp RecipeDto của backend. */
export interface RecipeEditorNutritionDto {
  calories: string | null;
  protein: string | null;
  carbohydrates: string | null;
  fat: string | null;
  fiber: string | null;
  sodium: string | null;
}

export interface RecipeEditorIngredientDto {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
  orderIndex: number;
}

export interface RecipeEditorStepDto {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes: number | null;
  imageUrl: string | null;
}

export interface RecipeEditorImageDto {
  imageId: string;
  originalUrl: string;
  altText: string | null;
  isPrimary: boolean;
}

export interface RecipeEditorDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructions: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: DifficultyLevel;
  status: RecipeStatus;
  categoryId: string;
  authorId: string;
  nutrition: RecipeEditorNutritionDto;
  steps: RecipeEditorStepDto[];
  ingredients: RecipeEditorIngredientDto[];
  images: RecipeEditorImageDto[];
  rowVersion: number;
  createdAt: string;
  updatedAt: string | null;
}
