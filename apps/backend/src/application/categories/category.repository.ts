import { CategorySummary } from '../../domain/categories/category';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryRepository {
  listActiveWithRecipeCount(): Promise<CategorySummary[]>;
}
