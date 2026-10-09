import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PlaceOrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn món ăn (productId)' })
  productId: string;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;

  /** Danh sách ID của các tùy chọn được chọn (ItemModifier IDs như Size L, Cay vừa, Topping trứng...) */
  @IsOptional()
  @IsArray({ message: 'Danh sách modifierIds phải là mảng' })
  @IsString({ each: true })
  modifierIds?: string[];
}

