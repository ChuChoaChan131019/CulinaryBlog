import { PagedResult, RecipeSummaryDto } from '@culinary/shared';
import {
  RecipeDifficulty,
  RecipeDraft,
  RecipeIngredient,
  RecipeStep,
} from '../../domain/recipes/recipe';

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');

export type RecipeSort = 'createdAt' | '-createdAt' | 'title' | '-title' | 'cookTime' | '-cookTime';

export interface RecipeListCriteria {
  page: number;
  pageSize: number;
  categoryId?: string;
  difficulty?: RecipeDifficulty;
  maxCookTime?: number;
  sort: RecipeSort;
  viewer?: { id: string; role: 'Author' | 'Admin' };
}

export interface RecipeCreated {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructions: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  status: 'Draft';
  categoryId: string;
  authorId: string;
  nutrition: {
    calories: string | null;
    protein: string | null;
    carbohydrates: string | null;
    fat: string | null;
    fiber: string | null;
    sodium: string | null;
  };
  steps: Array<Required<Pick<RecipeStep, 'stepNumber' | 'title' | 'description'>> & {
    id: string;
    timerMinutes: number | null;
    imageUrl: string | null;
  }>;
  ingredients: Array<Pick<RecipeIngredient, 'name'> & {
    id: string;
    quantity: string | null;
    unit: string | null;
    notes: string | null;
    orderIndex: number;
  }>;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface RecipeRepository {
  categoryExists(categoryId: string): Promise<boolean>;
  slugExists(slug: string): Promise<boolean>;
  createDraft(draft: RecipeDraft): Promise<RecipeCreated>;
  list(criteria: RecipeListCriteria): Promise<PagedResult<RecipeSummaryDto>>;
}
