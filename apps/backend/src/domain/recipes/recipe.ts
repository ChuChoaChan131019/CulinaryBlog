export type RecipeDifficulty = 'Easy' | 'Medium' | 'Hard';
export type RecipeStatus = 'Draft' | 'Published' | 'Archived';

export interface RecipeNutrition {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}

export interface RecipeStep {
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes?: number;
  imageUrl?: string;
}

export interface RecipeIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  orderIndex?: number;
}

export interface RecipeDraft {
  authorId: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions: string;
  nutrition?: RecipeNutrition;
  steps?: RecipeStep[];
  ingredients?: RecipeIngredient[];
}

export interface Recipe extends Omit<RecipeDraft, 'steps' | 'ingredients'> {
  id: string;
  status: RecipeStatus;
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
  createdAt: Date;
  updatedAt: Date | null;
}
