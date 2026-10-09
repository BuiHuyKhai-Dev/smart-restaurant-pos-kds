import { Role } from '@prisma/client';

/** Payload được ký vào JWT của nhân viên */
export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
  branchId: string | null;
}

/** Thông tin nhân viên gắn vào request.user sau khi xác thực JWT */
export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  branchId: string | null;
}

/** Thông tin khách tại bàn gắn vào request.tableGuest sau khi xác thực mã QR */
export interface TableGuestContext {
  tableId: string;
  branchId: string;
  tableNumber: string;
}

