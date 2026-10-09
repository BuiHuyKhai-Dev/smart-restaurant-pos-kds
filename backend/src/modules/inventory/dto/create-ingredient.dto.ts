import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  baseUnit: string;

  @IsOptional()
  @IsString()
  description?: string;
}

