/**
 * Parse `CORS_ORIGIN` (một hoặc nhiều origin phân cách bằng dấu phẩy) thành giá trị
 * `origin` của `enableCors`. Không set biến → trả `false` (fail-closed: không origin
 * nào được phép) thay vì `*`, vì API trả dữ liệu theo Bearer token.
 */
export function corsOrigins(value?: string): string[] | false {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
  return origins.length ? origins : false;
}
