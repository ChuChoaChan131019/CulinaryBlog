import { ApiError } from '@/lib/api';

/** Chỉ cho phép redirect nội bộ — chặn open redirect qua query param `redirect`. */
export function safeRedirect(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.startsWith('/') ? first : '/';
}

/**
 * SRS: sai mật khẩu phải hiện lỗi chung (không tiết lộ email có tồn tại hay không),
 * và 429 phải báo người dùng thử lại sau thay vì lỗi kỹ thuật.
 */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Email hoặc mật khẩu không đúng.';
    if (error.status === 429) return 'Bạn đã thử đăng nhập quá nhiều lần, vui lòng thử lại sau.';
    return error.message;
  }
  return 'Không thể đăng nhập, thử lại sau.';
}
