import { IsNotEmpty, IsString } from 'class-validator';

export class MergeTableDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn bàn nguồn cần gộp' })
  fromTableId: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn bàn đích gộp vào' })
  toTableId: string;
}

