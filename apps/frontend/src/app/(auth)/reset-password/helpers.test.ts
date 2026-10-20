import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  resetPasswordErrorMessage,
  validateResetPassword,
} from './helpers';

describe('validateResetPassword', () => {
  it('báo lỗi khi chưa nhập mật khẩu mới', () => {
    expect(validateResetPassword('', '')).toBe('Vui lòng nhập mật khẩu mới.');
  });

  it('báo lỗi khi mật khẩu dưới 8 ký tự', () => {
    expect(validateResetPassword('Pass@1', 'Pass@1')).toBe(
      'Mật khẩu mới phải có ít nhất 8 ký tự.',
    );
  });

  it('báo lỗi khi thiếu số/hoa/thường/ký tự đặc biệt', () => {
    expect(validateResetPassword('password123', 'password123')).toBe(
      'Mật khẩu mới phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.',
    );
  });

  it('báo lỗi khi mật khẩu xác nhận không khớp', () => {
    expect(validateResetPassword('NewPass@123', 'Different@123')).toBe(
      'Mật khẩu xác nhận không khớp.',
    );
  });

  it('trả về null khi thông tin hợp lệ', () => {
    expect(validateResetPassword('NewPass@123', 'NewPass@123')).toBeNull();
  });
});

describe('resetPasswordErrorMessage', () => {
  it('chuyển lỗi 400 AUTH_RESET_TOKEN_INVALID thành thông báo tiếng Việt', () => {
    const error = new ApiError(400, {
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'AUTH_RESET_TOKEN_INVALID',
    });
    expect(resetPasswordErrorMessage(error)).toBe(
      'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
    );
  });

  it('trích xuất lỗi field nếu có', () => {
    const error = new ApiError(400, {
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      errors: { newPassword: ['newPassword không đủ dài'] },
    });
    expect(resetPasswordErrorMessage(error)).toBe('newPassword không đủ dài');
  });
});
