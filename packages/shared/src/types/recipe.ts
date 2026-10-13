import type { UserProfileDto } from './auth';
import type { CategoryDto } from './category';

export type RecipeStatus = 'Draft' | 'Published' | 'Archived';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface RecipeIngredientDto {
  id: string;
  name: string;
  quantity: string;
  unit: string | null;
  order: number;
}

export interface RecipeStepDto {
  id: string;
  order: number;
  instruction: string;
  imageUrl: string | null;
}

export interface RecipeImageDto {
  id: string;
  url: string;
  alt: string | null;
  isCover: boolean;
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
  author: Pick<UserProfileDto, 'id' | 'displayName' | 'avatarUrl'>;
  category: Pick<CategoryDto, 'id' | 'name' | 'slug'>;
  publishedAt: string | null;
  createdAt: string;
}

export interface RecipeSearchResultDto extends RecipeSummaryDto {
  relevanceScore: number;
}

export interface RecipeDetailDto extends RecipeSummaryDto {
  description: string | null;
  ingredients: RecipeIngredientDto[];
  steps: RecipeStepDto[];
  images: RecipeImageDto[];
  updatedAt: string;
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
