'use client';

import { useSyncExternalStore } from 'react';
import type { AuthResponseDto, UserProfileDto } from '@culinary/shared';
import { ApiError, baseUrl, parse } from './api';

/**
 * Lớp quản lý phiên đăng nhập phía client.
 *
 * Token lưu ở `localStorage` chứ không dùng cookie: SRS chương 8.1 bắt refresh token
 * đi trong request body để tránh CSRF, nên cookie `httpOnly` không dùng được. Đổi lại
 * phải chấp nhận rủi ro XSS — mọi nội dung do người dùng nhập phải được escape.
 */
const STORAGE_KEY = 'culinary.session';

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserProfileDto;
}

let session: Session | null | undefined;
const listeners = new Set<() => void>();

function read(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    // localStorage bị chặn (private mode) hoặc dữ liệu hỏng → coi như chưa đăng nhập.
    return null;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function getSession(): Session | null {
  // Cache để `useSyncExternalStore` nhận đúng một tham chiếu ổn định giữa các lần render.
  if (session === undefined) session = read();
  return session;
}

export function setSession(next: Session | null) {
  session = next;
  if (typeof window !== 'undefined') {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Đăng xuất ở tab khác phải đá luôn tab này.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      session = read();
      emit();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Phiên hiện tại, tự re-render khi đăng nhập/đăng xuất (kể cả từ tab khác). */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}

async function post<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return parse<T>(res);
}

/**
 * `/auth/login`, `/auth/google` và `/auth/refresh` ở backend chỉ trả cặp token, không
 * kèm profile (xem `TokenPair` trong `commands/issue-tokens.ts`), nên phải gọi thêm
 * `/auth/me` một lần để dựng phiên.
 */
type TokenPair = Pick<AuthResponseDto, 'accessToken' | 'refreshToken' | 'expiresIn'>;

function fetchProfile(accessToken: string): Promise<UserProfileDto> {
  return fetch(`${baseUrl}/auth/me`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
  }).then((res) => parse<UserProfileDto>(res));
}

async function establish(tokens: TokenPair): Promise<Session> {
  const next = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: await fetchProfile(tokens.accessToken),
  };
  setSession(next);
  return next;
}

export async function login(email: string, password: string): Promise<Session> {
  return establish(await post<TokenPair>('/auth/login', { email, password }));
}

export async function loginWithGoogle(idToken: string): Promise<Session> {
  return establish(await post<TokenPair>('/auth/google', { idToken }));
}

export async function logout(): Promise<void> {
  const current = getSession();
  setSession(null);
  if (!current) return;
  // Backend trả 204 idempotent; mạng lỗi cũng không được giữ lại phiên phía client.
  await post<void>('/auth/logout', { refreshToken: current.refreshToken }, current.accessToken).catch(
    () => undefined,
  );
}

/**
 * Đổi refresh token lấy cặp token mới.
 *
 * Nhiều request 401 cùng lúc phải dùng chung một lần gọi: token có rotation nên lần
 * refresh thứ hai sẽ dùng token đã bị thu hồi và bị backend coi là reuse attack.
 */
let refreshing: Promise<Session | null> | null = null;

async function rotate(): Promise<Session | null> {
  const current = getSession();
  if (!current) return null;
  try {
    const tokens = await post<TokenPair>('/auth/refresh', { refreshToken: current.refreshToken });
    // Giữ lại profile đang có: `/auth/refresh` không trả user, và refresh xảy ra giữa
    // lúc người dùng đang làm việc nên không nên thêm một round trip nữa.
    const next = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: current.user,
    };
    setSession(next);
    return next;
  } catch {
    // Refresh token hết hạn hoặc bị thu hồi → buộc đăng nhập lại.
    setSession(null);
    return null;
  }
}

export function refresh(): Promise<Session | null> {
  // `finally` phải gắn vào promise rồi mới gán, không đặt trong thân `rotate`: nhánh
  // "chưa đăng nhập" trả về đồng bộ, callback trong thân sẽ xoá `refreshing` trước khi
  // `??=` kịp gán và biến này kẹt lại ở một promise cũ vĩnh viễn.
  refreshing ??= rotate().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * Gọi API kèm Bearer token, tự refresh đúng một lần khi gặp 401 rồi thử lại.
 * Dùng cho mọi endpoint cần đăng nhập; endpoint công khai vẫn dùng `apiGet`.
 */
export async function apiAuthed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = async (token: string | undefined) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

  let res = await send(getSession()?.accessToken);
  if (res.status === 401) {
    const renewed = await refresh();
    if (!renewed) throw new ApiError(401, null);
    res = await send(renewed.accessToken);
  }
  return parse<T>(res);
}

export function getProfile(): Promise<UserProfileDto> {
  return apiAuthed<UserProfileDto>('/auth/me');
}

export async function updateProfile(
  patch: Partial<Pick<UserProfileDto, 'displayName' | 'avatarUrl' | 'bio'>>,
): Promise<UserProfileDto> {
  const user = await apiAuthed<UserProfileDto>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  const current = getSession();
  if (current) setSession({ ...current, user });
  return user;
}
