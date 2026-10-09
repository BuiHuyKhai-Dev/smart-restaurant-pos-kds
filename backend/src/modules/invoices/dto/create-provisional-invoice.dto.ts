import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProvisionalInvoiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp tableId' })
  tableId: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Phần trăm giảm giá tối thiểu là 0%' })
  @Max(100, { message: 'Phần trăm giảm giá tối đa là 100%' })
  discountPercent?: number;
}

