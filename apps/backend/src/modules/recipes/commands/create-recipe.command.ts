import {
  CreateRecipeIngredientDto,
  CreateRecipeStepDto,
  RecipeDifficulty,
  RecipeNutritionDto,
} from '../dto/create-recipe.dto';

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
    public readonly nutrition?: RecipeNutritionDto,
    public readonly steps?: CreateRecipeStepDto[],
    public readonly ingredients?: CreateRecipeIngredientDto[],
  ) {}
}
