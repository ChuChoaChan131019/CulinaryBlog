import { ApiError, baseUrl, parse } from '@/lib/api';

export interface RegisterFieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
}

/** Khớp rule backend (`RegisterDto`): displayName 2-100 ký tự, email hợp lệ, password NFR-SEC-001. */
export function validateRegister(displayName: string, email: string, password: string): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const name = displayName.trim();
  if (name.length < 2 || name.length > 100) {
    errors.displayName = 'Họ tên phải từ 2 đến 100 ký tự.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email không hợp lệ.';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/.test(password)) {
    errors.password = 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';
  }
  return errors;
}

export interface RegisterResult {
  userId: string;
  email: string;
  displayName: string;
}

export async function registerUser(displayName: string, email: string, password: string): Promise<RegisterResult> {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  return parse<RegisterResult>(res);
}

/** 409 AUTH_EMAIL_EXISTS phải gắn lỗi vào field email, không phải lỗi chung. */
export function registerErrorMessage(error: unknown): { field?: keyof RegisterFieldErrors; message: string } {
  if (error instanceof ApiError) {
    if (error.status === 409) return { field: 'email', message: 'Email này đã được sử dụng.' };
    if (error.status === 429) return { message: 'Bạn đã thử quá nhiều lần, vui lòng thử lại sau.' };
    return { message: error.message };
  }
  return { message: 'Không thể đăng ký, thử lại sau.' };
}
