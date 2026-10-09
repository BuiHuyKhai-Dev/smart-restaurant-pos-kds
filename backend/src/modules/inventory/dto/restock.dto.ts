import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RestockItemDto {
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsNumber()
  costPrice?: number;
}

export class RestockDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestockItemDto)
  items: RestockItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

