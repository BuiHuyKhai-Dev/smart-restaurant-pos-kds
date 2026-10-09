import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlaceOrderItemDto } from './place-order-item.dto';

export class PlaceOrderDto {
  /** ID bàn ăn (Bắt buộc nếu nhân viên POS gọi món, tự động nhận diện nếu khách dùng mã QR bàn) */
  @IsOptional()
  @IsString()
  tableId?: string;

  /** Số lượng khách tại bàn nếu là lần mở bàn đầu tiên */
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  /** Ghi chú chung cho đợt gọi món */
  @IsOptional()
  @IsString()
  note?: string;

  /** Danh sách món ăn đặt trong đợt này */
  @IsArray({ message: 'Danh sách món ăn phải là một mảng' })
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 món ăn' })
  @ValidateNested({ each: true })
  @Type(() => PlaceOrderItemDto)
  items: PlaceOrderItemDto[];
}

