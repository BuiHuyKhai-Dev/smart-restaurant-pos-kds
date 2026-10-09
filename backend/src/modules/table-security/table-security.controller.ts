import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, TableGuest } from '../../common/decorators/current-user.decorator';
import { TableGuestGuard } from '../../common/guards/table-guest.guard';
import type { AuthUser, TableGuestContext } from '../../common/interfaces/auth.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { IssueQrDto } from './dto/issue-qr.dto';
import { TableTokenService } from './table-token.service';

@Controller()
export class TableSecurityController {
  constructor(
    private readonly tableTokenService: TableTokenService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /api/tables/:tableId/qr
   * Nhân viên lấy URL QR để in / hiển thị. Body { rotate: true } để thu hồi QR cũ.
   */
  @Post('tables/:tableId/qr')
  @Roles(Role.MANAGER, Role.CASHIER)
  issueQr(@Param('tableId') tableId: string, @Body() dto: IssueQrDto, @CurrentUser() user: AuthUser) {
    return this.tableTokenService.issueQr(tableId, user, dto.rotate ?? false);
  }

  /**
   * GET /api/table-access/me   (header x-table-token hoặc ?t=)
   * Trang /table/[id] gọi khi khách vừa quét QR để kiểm tra mã và lấy thông tin bàn.
   */
  @Public()
  @UseGuards(TableGuestGuard)
  @Get('table-access/me')
  async me(@TableGuest() guest: TableGuestContext) {
    return this.prisma.table.findUniqueOrThrow({
      where: { id: guest.tableId },
      select: {
        id: true,
        tableNumber: true,
        displayName: true,
        capacity: true,
        area: true,
        status: true,
        branch: { select: { id: true, name: true, address: true, phoneNumber: true } },
      },
    });
  }
}
