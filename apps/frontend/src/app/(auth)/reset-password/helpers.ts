import { ApiError } from '@/lib/api';

export function validateResetPassword(
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!newPassword) return 'Vui lòng nhập mật khẩu mới.';
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
export function resetPasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.fieldErrors.newPassword?.[0]) {
      return error.fieldErrors.newPassword[0];
    }
    if (error.code === 'AUTH_RESET_TOKEN_INVALID' || error.status === 400) {
      return 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.';
    }
    return error.message;
  }
  return 'Không thể đặt lại mật khẩu, vui lòng thử lại sau.';
}
