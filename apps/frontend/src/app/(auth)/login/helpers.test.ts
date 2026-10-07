import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { loginErrorMessage, safeRedirect } from './helpers';

describe('safeRedirect', () => {
  it('giữ lại path nội bộ', () => {
    expect(safeRedirect('/profile')).toBe('/profile');
  });

  it('bỏ array, lấy phần tử đầu', () => {
    expect(safeRedirect(['/recipes', '/other'])).toBe('/recipes');
  });

  it('chặn open redirect ra domain ngoài', () => {
    expect(safeRedirect('https://evil.com')).toBe('/');
  });

  it('mặc định về trang chủ khi thiếu', () => {
    expect(safeRedirect(undefined)).toBe('/');
  });
});

describe('loginErrorMessage', () => {
  it('401 trả lỗi chung, không tiết lộ email có tồn tại', () => {
    expect(loginErrorMessage(new ApiError(401, null))).toBe('Email hoặc mật khẩu không đúng.');
  });

  it('429 báo thử lại sau', () => {
    expect(loginErrorMessage(new ApiError(429, null))).toBe(
      'Bạn đã thử đăng nhập quá nhiều lần, vui lòng thử lại sau.',
    );
  });

  it('lỗi khác giữ nguyên message từ backend', () => {
    const err = new ApiError(400, {
      type: 'about:blank',
      title: 'Invalid',
      status: 400,
      detail: 'AUTH_GOOGLE_TOKEN_INVALID',
    });
    expect(loginErrorMessage(err)).toBe('AUTH_GOOGLE_TOKEN_INVALID');
  });

  it('lỗi không xác định trả thông báo mặc định', () => {
    expect(loginErrorMessage(new Error('network down'))).toBe('Không thể đăng nhập, thử lại sau.');
  });
});
