import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { OrderItemStatus, Role } from '@prisma/client';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser, JwtPayload } from '../../common/interfaces/auth.interface';
import { TableTokenService } from '../table-security/table-token.service';
import { OrdersService } from './orders.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';

@Controller()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly tableTokenService: TableTokenService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Đặt món linh hoạt: Phục vụ cả Khách tại bàn (Mã QR) lẫn Thu ngân POS (Tài khoản nhân viên)
   * POST /api/orders
   */
  @Public()
  @Post('orders')
  async placeOrder(
    @Body() dto: PlaceOrderDto,
    @Headers('x-table-token') tableTokenHeader?: string,
    @Query('t') tableTokenQuery?: string,
    @Headers('authorization') authHeader?: string,
    @Req() req?: Request,
  ) {
    const rawQrToken = tableTokenHeader || tableTokenQuery;

    // 1. Trường hợp Khách quét QR gọi món tại bàn
    if (rawQrToken) {
      const guest = await this.tableTokenService.verify(rawQrToken);
      return this.ordersService.placeOrder(dto, guest.tableId, { isGuest: true });
    }

    // 2. Trường hợp Nhân viên / Thu ngân gọi món từ POS
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwtToken = authHeader.split(' ')[1];
      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(jwtToken);
        if (!dto.tableId) {
          throw new UnauthorizedException('Thu ngân cần cung cấp tableId để đặt món tại quầy');
        }
        const user: AuthUser = {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
          branchId: payload.branchId,
        };
        return this.ordersService.placeOrder(dto, dto.tableId, { isGuest: false, user });
      } catch (e) {
        if (e instanceof UnauthorizedException) throw e;
        throw new UnauthorizedException('Phiên đăng nhập nhân viên không hợp lệ');
      }
    }

    // 3. Trường hợp Khách gọi món theo bàn (Mã QR tĩnh trên bàn hoặc chế độ linh hoạt LAN/Local)
    if (dto.tableId) {
      return this.ordersService.placeOrder(dto, dto.tableId, { isGuest: true });
    }

    throw new UnauthorizedException(
      'Vui lòng quét mã QR tại bàn hoặc đăng nhập tài khoản nhân viên để gọi món',
    );
  }

  /**
   * Bếp KDS cập nhật trạng thái món (Pending -> Cooking -> Ready -> Served -> Cancelled)
   * PATCH /api/orders/items/:id/status
   */
  @Patch('orders/items/:id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.COOK, Role.CASHIER)
  updateOrderItemStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderItemStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.updateOrderItemStatus(id, dto.status, user);
  }

  /**
   * Bếp KDS hoàn tất toàn bộ vé order (Batch Complete)
   * PATCH /api/orders/:id/complete-all
   */
  @Patch('orders/:id/complete-all')
  @Roles(Role.ADMIN, Role.MANAGER, Role.COOK, Role.CASHIER)
  completeOrderTicket(
    @Param('id') id: string,
    @Query('stationId') stationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.completeOrderTicket(id, stationId, user);
  }

  /**
   * Lấy danh sách các món cần chế biến trên màn hình Bếp KDS
   * GET /api/orders/kds?branchId=...&stationId=...
   */
  @Get('orders/kds')
  @Roles(Role.ADMIN, Role.MANAGER, Role.COOK, Role.CASHIER)
  getKdsItems(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('stationId') stationId?: string,
    @Query('status') status?: OrderItemStatus,
  ) {
    // Nếu nhân viên có branchId, ưu tiên chi nhánh của nhân viên
    const effectiveBranchId = user.role === Role.ADMIN && branchId ? branchId : user.branchId || branchId;
    if (!effectiveBranchId) {
      throw new UnauthorizedException('Vui lòng chỉ định branchId cho màn hình Bếp');
    }
    return this.ordersService.getKdsItems(effectiveBranchId, stationId, status);
  }

  /**
   * Xem toàn bộ món ăn và tiến độ trong phiên hiện tại của bàn
   * GET /api/orders/table/:tableId/current
   */
  @Public()
  @Get('orders/table/:tableId/current')
  getCurrentSession(@Param('tableId') tableId: string) {
    return this.ordersService.getCurrentSessionByTable(tableId);
  }

  /**
   * Khách tại bàn hoặc Thu ngân bấm Gọi thanh toán
   * POST /api/tables/:id/request-payment
   */
  @Public()
  @Post('tables/:id/request-payment')
  requestPayment(@Param('id') id: string) {
    return this.ordersService.requestPayment(id);
  }
}
