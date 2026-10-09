import { IsNotEmpty, IsString } from 'class-validator';

export class TransferTableDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn bàn nguồn cần chuyển đi' })
  fromTableId: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn bàn đích cần chuyển đến' })
  toTableId: string;
}

