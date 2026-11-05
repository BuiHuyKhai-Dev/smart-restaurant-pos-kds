import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProvisionalInvoiceDto {
  @ApiProperty({ example: 'tbl-1', description: 'ID bàn ăn cần lập phiếu tạm tính' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp tableId' })
  tableId: string;

  @ApiPropertyOptional({ example: 10, description: 'Phần trăm giảm giá (0 - 100%)' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Phần trăm giảm giá tối thiểu là 0%' })
  @Max(100, { message: 'Phần trăm giảm giá tối đa là 100%' })
  discountPercent?: number;
}
