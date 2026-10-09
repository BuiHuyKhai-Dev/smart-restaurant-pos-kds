import { IsArray, IsNotEmpty, IsNumber, IsPositive, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeItemDto {
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @IsNumber()
  @IsPositive()
  amountNeeded: number;
}

export class UpdateRecipeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  recipes: RecipeItemDto[];
}

