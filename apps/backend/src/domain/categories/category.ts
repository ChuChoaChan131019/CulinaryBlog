export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isDeleted: boolean;
}

export interface CategorySummary extends Omit<Category, 'isDeleted'> {
  recipeCount: number;
}
