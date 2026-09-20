import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export enum RecipeDifficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export class RecipeNutritionDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  calories?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  protein?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  carbohydrates?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  fat?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  fiber?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  sodium?: number;
}

export class CreateRecipeStepDto {
  @IsInt()
  @Min(1)
  stepNumber!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  timerMinutes?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  imageUrl?: string;
}

export class CreateRecipeIngredientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class CreateRecipeDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsUUID()
  categoryId!: string;

  @IsInt()
  @Min(1)
  prepTime!: number;

  @IsInt()
  @Min(1)
  cookTime!: number;

  @IsInt()
  @Min(1)
  servings!: number;

  @IsEnum(RecipeDifficulty)
  difficulty!: RecipeDifficulty;

  @IsString()
  @MinLength(1)
  instructions!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecipeNutritionDto)
  nutrition?: RecipeNutritionDto;

  @IsOptional()
  @IsArray()
  @ArrayUnique((step: CreateRecipeStepDto) => step.stepNumber)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps?: CreateRecipeStepDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients?: CreateRecipeIngredientDto[];
}
