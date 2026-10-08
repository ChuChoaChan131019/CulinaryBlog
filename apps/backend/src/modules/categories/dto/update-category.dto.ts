import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateCategoryDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[^<>]*$/, { message: 'name không được chứa HTML' })
  name!: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Transform(trim)
  @IsString()
  description?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Transform(trim)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  imageUrl?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
