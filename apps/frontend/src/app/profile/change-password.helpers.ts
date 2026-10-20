import { ApiError } from '@/lib/api';

export function validateChangePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!currentPassword) return 'Vui lòng nhập mật khẩu hiện tại.';
  if (newPassword.length < 8) return 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  const passwordRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
  if (!passwordRegex.test(newPassword)) {
    return 'Mật khẩu mới phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.';
  }
  if (newPassword !== confirmPassword) {
    return 'Mật khẩu xác nhận không khớp.';
  }
  return null;
}

export function changePasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'AUTH_INVALID_CREDENTIALS' || error.status === 401) {
      return 'Mật khẩu hiện tại không chính xác.';
    }
    if (error.code === 'AUTH_PASSWORD_NOT_SET' || error.status === 422) {
      return 'Tài khoản đăng nhập qua Google chưa thiết lập mật khẩu.';
    }
    if (error.fieldErrors.newPassword?.[0]) {
      return error.fieldErrors.newPassword[0];
    }
    return error.message;
  }
  return 'Không thể đổi mật khẩu, vui lòng thử lại sau.';
}
