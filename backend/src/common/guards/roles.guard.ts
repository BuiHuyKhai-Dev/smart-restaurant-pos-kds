import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../interfaces/auth.interface';

/**
 * Kiểm tra vai trò theo @Roles(). Route không gắn @Roles thì chỉ cần đăng nhập.
 * ADMIN luôn được phép.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    if (user.role === Role.ADMIN || requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException(`Chức năng này yêu cầu vai trò: ${requiredRoles.join(', ')}`);
  }
}

