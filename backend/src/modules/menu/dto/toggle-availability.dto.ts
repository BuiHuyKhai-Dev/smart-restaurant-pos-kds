import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleAvailabilityDto {
  @IsBoolean()
  @IsNotEmpty({ message: 'Vui lòng cung cấp trạng thái khả dụng' })
  isAvailable: boolean;
}

