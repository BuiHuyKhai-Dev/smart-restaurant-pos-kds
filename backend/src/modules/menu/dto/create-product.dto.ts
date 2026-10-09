import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên món ăn' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn danh mục món ăn' })
  categoryId: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn trạm bếp KDS mặc định' })
  kitchenStationId: string;

  @IsNumber({}, { message: 'Giá bán phải là số hợp lệ' })
  @Min(0, { message: 'Giá bán không được âm' })
  price: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  pictureLink?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  standardPrepMinutes?: number;
}

