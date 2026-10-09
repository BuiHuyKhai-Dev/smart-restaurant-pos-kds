import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Giới hạn route theo vai trò, ví dụ: @Roles(Role.ADMIN, Role.CASHIER) */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

