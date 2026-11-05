import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TransferTableDto {
  @ApiProperty({ example: 'tbl-1', description: 'ID bàn nguồn cần chuyển đi' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn bàn nguồn cần chuyển đi' })
  fromTableId: string;

  @ApiProperty({ example: 'tbl-3', description: 'ID bàn đích cần chuyển đến' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn bàn đích cần chuyển đến' })
  toTableId: string;
}
