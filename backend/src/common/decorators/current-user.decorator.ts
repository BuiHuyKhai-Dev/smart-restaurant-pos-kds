import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser, TableGuestContext } from '../interfaces/auth.interface';

/** Lấy nhân viên đang đăng nhập: method(@CurrentUser() user: AuthUser) */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});

/** Lấy thông tin bàn của khách (sau TableGuestGuard): method(@TableGuest() guest: TableGuestContext) */
export const TableGuest = createParamDecorator((_data: unknown, ctx: ExecutionContext): TableGuestContext => {
  return ctx.switchToHttp().getRequest().tableGuest;
});

