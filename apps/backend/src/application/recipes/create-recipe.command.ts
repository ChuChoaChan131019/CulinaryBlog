import {
  RecipeDifficulty,
  RecipeIngredient,
  RecipeNutrition,
  RecipeStep,
} from '../../domain/recipes/recipe';

export class CreateRecipeCommand {
  constructor(
    public readonly authorId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly categoryId: string,
    public readonly prepTime: number,
    public readonly cookTime: number,
    public readonly servings: number,
    public readonly difficulty: RecipeDifficulty,
    public readonly instructions: string,
    public readonly nutrition?: RecipeNutrition,
    public readonly steps?: RecipeStep[],
    public readonly ingredients?: RecipeIngredient[],
  ) {}
}
