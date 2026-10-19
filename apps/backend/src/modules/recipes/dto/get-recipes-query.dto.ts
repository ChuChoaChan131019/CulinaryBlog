import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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

export enum RecipeListStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived',
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
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  mine?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(RecipeListStatus)
  status?: RecipeListStatus;

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
  @IsIn(RECIPE_SORT_VALUES)
  sort: RecipeSort = '-createdAt';
}

export interface GetRecipesQueryParams {
  page: number;
  pageSize: number;
  mine?: boolean;
  status?: RecipeListStatus;
  categoryId?: string;
  difficulty?: RecipeListDifficulty;
  maxCookTime?: number;
  minServings?: number;
  sort: RecipeSort;
}
