import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator đánh dấu endpoint là public — bỏ qua JwtAuthGuard.
 * Dùng cho các trường hợp khẩn cấp như gửi rescue request mà không cần login.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
