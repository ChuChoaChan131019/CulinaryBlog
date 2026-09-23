import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
  ValidateBy,
} from 'class-validator';
import { RecipeDifficulty } from './create-recipe.dto';

export class UpdateRecipeNutritionDto {
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  calories?: number | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  protein?: number | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  carbohydrates?: number | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  fat?: number | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  fiber?: number | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  sodium?: number | null;
}

export class UpdateRecipeDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  categoryId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  prepTime?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  cookTime?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  servings?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(RecipeDifficulty)
  difficulty?: RecipeDifficulty;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  instructions?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @ValidateBy({
    name: 'isNonEmptyObject',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'object' &&
        value !== null &&
        Object.values(value).some((item) => item !== undefined),
      defaultMessage: () => 'nutrition không được là object rỗng',
    },
  })
  @ValidateNested()
  @Type(() => UpdateRecipeNutritionDto)
  nutrition?: UpdateRecipeNutritionDto;
}
