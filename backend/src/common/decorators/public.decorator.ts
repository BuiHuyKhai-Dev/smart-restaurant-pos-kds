import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Đánh dấu route không cần JWT nhân viên.
 * Mặc định MỌI route đều yêu cầu đăng nhập (JwtAuthGuard global).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

