import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum RecipeListDifficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export const RECIPE_SORT_VALUES = [
  'createdAt',
  '-createdAt',
  'title',
  '-title',
  'cookTime',
  '-cookTime',
] as const;

export type RecipeSort = (typeof RECIPE_SORT_VALUES)[number];

export class GetRecipesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 12;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(RecipeListDifficulty)
  difficulty?: RecipeListDifficulty;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxCookTime?: number;

  @IsOptional()
  @IsIn(RECIPE_SORT_VALUES)
  sort: RecipeSort = '-createdAt';
}

export interface GetRecipesQueryParams {
  page: number;
  pageSize: number;
  categoryId?: string;
  difficulty?: RecipeListDifficulty;
  maxCookTime?: number;
  sort: RecipeSort;
}
