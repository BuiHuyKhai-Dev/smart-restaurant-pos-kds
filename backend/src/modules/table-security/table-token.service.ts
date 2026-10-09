import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, TableGuestContext } from '../../common/interfaces/auth.interface';

/**
 * Mã QR bàn có dạng: <tableId>.<nonce>.<signature>
 *  - nonce: chuỗi ngẫu nhiên lưu ở cột tables.qr_token. Đổi nonce = vô hiệu hoá toàn bộ QR cũ của bàn.
 *  - signature: HMAC-SHA256(TABLE_QR_SECRET, "<tableId>.<nonce>") -> không thể tự chế token.
 * Secret chỉ nằm ở backend; frontend không còn tự ký token.
 */
@Injectable()
export class TableTokenService {
  private readonly secret: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('TABLE_QR_SECRET');
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000').replace(/\/+$/, '');
  }

  /** Nhân viên lấy (hoặc tạo mới / xoay vòng) mã QR cho bàn */
  async issueQr(tableId: string, user: AuthUser, rotate = false) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Không tìm thấy bàn');

    if (user.role !== Role.ADMIN && user.branchId !== table.branchId) {
      throw new ForbiddenException('Bạn chỉ được quản lý bàn thuộc chi nhánh của mình');
    }

    let nonce = table.qrToken;
    if (!nonce || rotate) {
      nonce = randomBytes(16).toString('base64url');
      await this.prisma.table.update({ where: { id: tableId }, data: { qrToken: nonce } });
    }

    const token = `${table.id}.${nonce}.${this.sign(table.id, nonce)}`;
    return {
      tableId: table.id,
      tableNumber: table.tableNumber,
      token,
      url: `${this.frontendUrl}/table/${encodeURIComponent(table.id)}?t=${encodeURIComponent(token)}`,
      rotated: rotate || !table.qrToken,
    };
  }

  /** Xác thực token khách gửi lên. Ném 401 nếu không hợp lệ. */
  async verify(token: string | undefined): Promise<TableGuestContext> {
    const invalid = new UnauthorizedException('Mã QR bàn không hợp lệ hoặc đã bị thu hồi. Vui lòng quét lại mã trên bàn.');
    if (!token) throw invalid;

    // tableId có thể chứa dấu chấm? Không - id là uuid hoặc "tbl-x". Tách từ phải để an toàn.
    const lastDot = token.lastIndexOf('.');
    const secondLastDot = token.lastIndexOf('.', lastDot - 1);
    if (lastDot <= 0 || secondLastDot <= 0) throw invalid;

    const tableId = token.slice(0, secondLastDot);
    const nonce = token.slice(secondLastDot + 1, lastDot);
    const signature = token.slice(lastDot + 1);

    if (!this.safeEqual(signature, this.sign(tableId, nonce))) throw invalid;

    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true, branchId: true, tableNumber: true, qrToken: true, branch: { select: { isActive: true } } },
    });
    if (!table || table.qrToken !== nonce) throw invalid;
    if (!table.branch.isActive) throw new ForbiddenException('Chi nhánh hiện đang tạm ngưng phục vụ');

    return { tableId: table.id, branchId: table.branchId, tableNumber: table.tableNumber };
  }

  private sign(tableId: string, nonce: string): string {
    return createHmac('sha256', this.secret).update(`${tableId}.${nonce}`).digest('base64url');
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  }
}

