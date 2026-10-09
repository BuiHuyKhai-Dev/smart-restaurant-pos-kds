import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { TableTokenService } from '../../modules/table-security/table-token.service';

/**
 * Xác thực khách tại bàn qua mã QR.
 * Token lấy từ header `x-table-token` (ưu tiên) hoặc query `?t=`.
 * Thành công -> gắn request.tableGuest = { tableId, branchId, tableNumber }.
 *
 * Dùng kèm @Public() vì khách không có JWT nhân viên.
 */
@Injectable()
export class TableGuestGuard implements CanActivate {
  constructor(private readonly tableTokenService: TableTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { tableGuest?: unknown }>();
    const headerToken = request.headers['x-table-token'];
    const queryToken = request.query['t'];

    const token =
      (typeof headerToken === 'string' && headerToken) || (typeof queryToken === 'string' && queryToken) || undefined;

    request.tableGuest = await this.tableTokenService.verify(token);
    return true;
  }
}

