import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  changePasswordErrorMessage,
  validateChangePassword,
} from './change-password.helpers';

describe('validateChangePassword', () => {
  it('báo lỗi khi chưa nhập mật khẩu hiện tại', () => {
    expect(validateChangePassword('', 'NewPass@123', 'NewPass@123')).toBe(
      'Vui lòng nhập mật khẩu hiện tại.',
    );
  });

  it('báo lỗi khi mật khẩu mới dưới 8 ký tự', () => {
    expect(validateChangePassword('OldPass@123', 'Pass@1', 'Pass@1')).toBe(
      'Mật khẩu mới phải có ít nhất 8 ký tự.',
    );
  });

  it('báo lỗi khi mật khẩu thiếu ký tự đặc biệt hoặc chữ hoa/thường/số', () => {
    expect(validateChangePassword('OldPass@123', 'newpassword123', 'newpassword123')).toBe(
      'Mật khẩu mới phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.',
    );
  });

  it('báo lỗi khi mật khẩu xác nhận không khớp', () => {
    expect(
      validateChangePassword('OldPass@123', 'NewPass@123', 'Different@123'),
    ).toBe('Mật khẩu xác nhận không khớp.');
  });

  it('trả về null khi thông tin hợp lệ', () => {
    expect(
      validateChangePassword('OldPass@123', 'NewPass@123', 'NewPass@123'),
    ).toBeNull();
  });
});

describe('changePasswordErrorMessage', () => {
  it('chuyển lỗi 401 sang thông báo tiếng Việt', () => {
    const error = new ApiError(401, {
      type: 'about:blank',
      title: 'Sai mật khẩu',
      status: 401,
      detail: 'AUTH_INVALID_CREDENTIALS',
    });
    expect(changePasswordErrorMessage(error)).toBe('Mật khẩu hiện tại không chính xác.');
  });

  it('chuyển lỗi 422 tài khoản Google sang thông báo tiếng Việt', () => {
    const error = new ApiError(422, {
      type: 'about:blank',
      title: 'Chưa có mật khẩu',
      status: 422,
      detail: 'AUTH_PASSWORD_NOT_SET',
    });
    expect(changePasswordErrorMessage(error)).toBe(
      'Tài khoản đăng nhập qua Google chưa thiết lập mật khẩu.',
    );
  });

  it('lấy lỗi fieldErrors nếu có', () => {
    const error = new ApiError(400, {
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      errors: { newPassword: ['newPassword phải có ít nhất 1 ký tự đặc biệt'] },
    });
    expect(changePasswordErrorMessage(error)).toBe(
      'newPassword phải có ít nhất 1 ký tự đặc biệt',
    );
  });
});
