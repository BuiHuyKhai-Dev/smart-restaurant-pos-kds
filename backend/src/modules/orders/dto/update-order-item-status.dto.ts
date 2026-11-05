import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderItemStatus } from '@prisma/client';

export class UpdateOrderItemStatusDto {
  @ApiProperty({ enum: OrderItemStatus, example: OrderItemStatus.READY, description: 'Trạng thái món (PENDING, COOKING, READY, SERVED, CANCELLED)' })
  @IsEnum(OrderItemStatus, { message: 'Trạng thái món không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp trạng thái món ăn' })
  status: OrderItemStatus;
}
