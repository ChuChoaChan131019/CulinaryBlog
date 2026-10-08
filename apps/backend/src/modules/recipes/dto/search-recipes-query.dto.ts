import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RecipeListDifficulty } from './get-recipes-query.dto';

export const SEARCH_SORT_VALUES = [
  'relevance',
  'createdAt',
  '-createdAt',
  'title',
  '-title',
  'cookTime',
  '-cookTime',
] as const;

export type SearchRecipeSort = (typeof SEARCH_SORT_VALUES)[number];

export class SearchRecipesQueryDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  q!: string;

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
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(RecipeListDifficulty)
  difficulty?: RecipeListDifficulty;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  maxCookTime?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  minServings?: number;

  @IsOptional()
  @IsIn(SEARCH_SORT_VALUES)
  sort: SearchRecipeSort = 'relevance';
}

export interface SearchRecipesQueryParams {
  q: string;
  page: number;
  pageSize: number;
  categoryId?: string;
  difficulty?: RecipeListDifficulty;
  maxCookTime?: number;
  minServings?: number;
  sort: SearchRecipeSort;
}
