import type { PagedResult } from './common';
import type { RecipeSummaryDto } from './recipe';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  recipeCount: number;
}

export interface CategoryDetailDto {
  category: CategoryDto;
  recipes: PagedResult<RecipeSummaryDto>;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface CreatedCategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}
