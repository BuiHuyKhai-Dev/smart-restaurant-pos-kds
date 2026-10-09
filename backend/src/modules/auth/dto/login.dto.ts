import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  /** Chấp nhận username (vd: "cashier") hoặc email (vd: "cashier@smartpos.vn") */
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên đăng nhập hoặc email' })
  @MaxLength(100)
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(100)
  password: string;
}

