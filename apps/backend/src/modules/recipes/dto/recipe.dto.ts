export interface RecipeNutritionResponseDto {
  calories: string | null;
  protein: string | null;
  carbohydrates: string | null;
  fat: string | null;
  fiber: string | null;
  sodium: string | null;
}

export interface RecipeStepResponseDto {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes: number | null;
  imageUrl: string | null;
}

export interface RecipeIngredientResponseDto {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
  orderIndex: number;
}

export interface RecipeDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructions: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'Draft';
  categoryId: string;
  authorId: string;
  nutrition: RecipeNutritionResponseDto;
  steps: RecipeStepResponseDto[];
  ingredients: RecipeIngredientResponseDto[];
  createdAt: Date;
  updatedAt: Date | null;
}
