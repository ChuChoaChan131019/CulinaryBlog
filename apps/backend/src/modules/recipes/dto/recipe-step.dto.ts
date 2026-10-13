import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateRecipeStepDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
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

export class UpdateRecipeStepDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  stepNumber?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
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
