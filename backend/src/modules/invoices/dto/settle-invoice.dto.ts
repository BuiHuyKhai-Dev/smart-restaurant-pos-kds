import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class SettleInvoiceDto {
  @ApiProperty({ example: 'inv-uuid-here', description: 'ID hóa đơn tạm tính vừa tạo' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp invoiceId' })
  invoiceId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.VIETQR, description: 'Phương thức thanh toán (CASH, VIETQR, CARD)' })
  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là CASH, VIETQR hoặc CARD',
  })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 200000, description: 'Số tiền khách đưa (nếu thanh toán tiền mặt)' })
  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Số tiền khách đưa phải là số dương' })
  cashGiven?: number;
}
