import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const authEmailExists = () =>
  new ConflictException({
    type: 'about:blank',
    title: 'Email đã tồn tại',
    status: HttpStatus.CONFLICT,
    detail: 'AUTH_EMAIL_EXISTS',
  });

export const authInvalidCredentials = () =>
  new UnauthorizedException({
    type: 'about:blank',
    title: 'Sai email hoặc mật khẩu',
    status: HttpStatus.UNAUTHORIZED,
    detail: 'AUTH_INVALID_CREDENTIALS',
  });

export const authAccountLocked = () =>
  new HttpException(
    {
      type: 'about:blank',
      title: `Tài khoản tạm khóa do đăng nhập sai quá ${MAX_FAILED_ATTEMPTS} lần, thử lại sau ${LOCKOUT_MINUTES} phút`,
      status: HttpStatus.LOCKED,
      detail: 'AUTH_ACCOUNT_LOCKED',
    },
    HttpStatus.LOCKED,
  );

export const authAccountDisabled = () =>
  new ForbiddenException({
    type: 'about:blank',
    title: 'Tài khoản đã bị vô hiệu hóa',
    status: HttpStatus.FORBIDDEN,
    detail: 'AUTH_ACCOUNT_DISABLED',
  });

export const authRefreshTokenExpired = () =>
  new UnauthorizedException({
    type: 'about:blank',
    title: 'Refresh token không hợp lệ hoặc đã hết hạn',
    status: HttpStatus.UNAUTHORIZED,
    detail: 'AUTH_REFRESH_TOKEN_EXPIRED',
  });

export const authRefreshTokenRevoked = () =>
  new UnauthorizedException({
    type: 'about:blank',
    title: 'Refresh token đã bị thu hồi',
    status: HttpStatus.UNAUTHORIZED,
    detail: 'AUTH_REFRESH_TOKEN_REVOKED',
  });

export const authGoogleTokenInvalid = () =>
  new BadRequestException({
    type: 'about:blank',
    title: 'Google ID token không hợp lệ',
    status: HttpStatus.BAD_REQUEST,
    detail: 'AUTH_GOOGLE_TOKEN_INVALID',
  });
