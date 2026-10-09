import { IsEnum, IsNotEmpty } from 'class-validator';
import { TableStatus } from '@prisma/client';

export class UpdateTableStatusDto {
  @IsEnum(TableStatus, { message: 'Trạng thái bàn không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp trạng thái bàn' })
  status: TableStatus;
}

