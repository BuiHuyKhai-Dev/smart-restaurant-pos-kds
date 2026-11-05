import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PlaceOrderItemDto {
  @ApiProperty({ example: 'menu-2', description: 'ID món ăn (vd: menu-1, menu-2, menu-3)' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn món ăn (productId)' })
  productId: string;

  @ApiProperty({ example: 2, description: 'Số lượng món đặt' })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  quantity: number;

  @ApiPropertyOptional({ example: 'Bánh phở mềm, thịt tái', description: 'Ghi chú chế biến riêng cho món' })
  @IsOptional()
  @IsString()
  note?: string;

  /** Danh sách ID của các tùy chọn được chọn (ItemModifier IDs như Size L, Cay vừa, Topping trứng...) */
  @ApiPropertyOptional({ example: [], description: 'Mảng ID các tùy chọn Topping/Modifiers' })
  @IsOptional()
  @IsArray({ message: 'Danh sách modifierIds phải là mảng' })
  @IsString({ each: true })
  modifierIds?: string[];
}
