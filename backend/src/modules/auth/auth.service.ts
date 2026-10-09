import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/auth.interface';
import { LoginDto } from './dto/login.dto';

/** Các trường an toàn để trả về client (không bao giờ trả password) */
const PUBLIC_ACCOUNT_SELECT = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  role: true,
  branchId: true,
  branch: { select: { id: true, name: true, address: true, phoneNumber: true } },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const identifier = dto.username.trim().toLowerCase();

    const account = await this.prisma.account.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });

    // Luôn so sánh bcrypt kể cả khi không tìm thấy tài khoản để thời gian phản hồi
    // không tiết lộ username có tồn tại hay không.
    const passwordHash = account?.password ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const isValid = await bcrypt.compare(dto.password, passwordHash);

    if (!account || !isValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const payload: JwtPayload = {
      sub: account.id,
      username: account.username,
      role: account.role,
      branchId: account.branchId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      user: await this.getProfile(account.id),
    };
  }

  async getProfile(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: PUBLIC_ACCOUNT_SELECT,
    });
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }
    return account;
  }
}

