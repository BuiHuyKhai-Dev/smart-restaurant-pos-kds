import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class UpdateSafetyStockDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @IsNumber()
  @IsPositive()
  minSafetyStock: number;
}

