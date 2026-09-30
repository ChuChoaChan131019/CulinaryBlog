import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRecipeIngredientDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100)
  name!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(50)
  unit!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  orderIndex?: number;
}

export class UpdateRecipeIngredientDto extends CreateRecipeIngredientDto {}
