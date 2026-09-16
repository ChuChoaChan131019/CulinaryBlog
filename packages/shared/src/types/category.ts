export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  recipeCount: number;
}

export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
}
