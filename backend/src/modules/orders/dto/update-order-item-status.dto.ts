import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderItemStatus } from '@prisma/client';

export class UpdateOrderItemStatusDto {
  @IsEnum(OrderItemStatus, { message: 'Trạng thái món không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp trạng thái món ăn' })
  status: OrderItemStatus;
}

