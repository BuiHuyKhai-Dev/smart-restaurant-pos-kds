import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthUser, JwtPayload } from '../../../common/interfaces/auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Đọc lại tài khoản từ DB mỗi request: nếu nhân viên bị xoá hoặc đổi vai trò/chi nhánh,
   * thay đổi có hiệu lực ngay mà không phải chờ token hết hạn.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const account = await this.prisma.account.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, branchId: true },
    });
    if (!account) {
      throw new UnauthorizedException('Tài khoản không còn tồn tại');
    }
    return account;
  }
}

