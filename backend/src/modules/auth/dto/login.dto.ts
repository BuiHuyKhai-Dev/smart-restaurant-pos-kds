import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  /** Chấp nhận username (vd: "cashier") hoặc email (vd: "cashier@smartpos.vn") */
  @ApiProperty({ example: 'cashier', description: 'Tên đăng nhập hoặc email (admin, cashier, kitchen)' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên đăng nhập hoặc email' })
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu tài khoản' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(100)
  password: string;
}
