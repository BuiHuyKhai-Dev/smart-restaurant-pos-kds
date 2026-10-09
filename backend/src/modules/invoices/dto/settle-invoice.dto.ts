import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class SettleInvoiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp invoiceId' })
  invoiceId: string;

  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là CASH, VIETQR hoặc CARD',
  })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Số tiền khách đưa phải là số dương' })
  cashGiven?: number;
}

