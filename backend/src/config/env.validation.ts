/**
 * Kiểm tra biến môi trường ngay khi khởi động.
 * Thiếu biến bắt buộc -> app dừng luôn thay vì lỗi mơ hồ lúc runtime.
 */
const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET', 'TABLE_QR_SECRET'] as const;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED_VARS.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(', ')}. Xem backend/.env.example`);
  }

  if (config.JWT_SECRET === config.TABLE_QR_SECRET) {
    throw new Error('JWT_SECRET và TABLE_QR_SECRET phải khác nhau.');
  }

  return config;
}

