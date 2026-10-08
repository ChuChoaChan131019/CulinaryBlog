import type {
  ApiResponse,
  PaginationMeta,
  PagedResponse,
  ProblemDetails,
} from '@culinary/shared';

/**
 * Client gọi REST API backend.
 *
 * - `NEXT_PUBLIC_API_URL` (vd `http://localhost/api`) không chứa `/v1`, version được
 *   nối ở đây để trùng prefix `api/v1` khai báo trong `main.ts` của backend.
 * - Server Component chạy trong container không đi qua `localhost` được, nên cho phép
 *   `API_URL` override riêng cho phía server (vd `http://nginx/api`).
 * - Response thành công luôn dùng envelope `{ data, meta? }` từ interceptor global.
 * - API phân trang dùng `apiGetPaged` để giữ lại `meta`; API thường dùng `apiGet`.
 */
export const baseUrl = `${(process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api').replace(/\/+$/, '')}/v1`;

export function unwrap<T>(body: unknown): T {
  if (!body || typeof body !== 'object' || !('data' in body)) {
    throw new Error('Response API không đúng envelope { data }.');
  }
  return (body as ApiResponse<T>).data;
}

function isPaginationMeta(value: unknown): value is PaginationMeta {
  if (!value || typeof value !== 'object') return false;
  const meta = value as Partial<PaginationMeta>;
  return (
    typeof meta.totalCount === 'number' &&
    typeof meta.page === 'number' &&
    typeof meta.pageSize === 'number' &&
    typeof meta.totalPages === 'number' &&
    typeof meta.hasNextPage === 'boolean' &&
    typeof meta.hasPreviousPage === 'boolean'
  );
}

export function unwrapPaged<T>(body: unknown): PagedResponse<T> {
  const envelope = body as { data?: unknown; meta?: unknown } | null;
  if (
    !envelope ||
    typeof envelope !== 'object' ||
    !Array.isArray(envelope.data) ||
    !isPaginationMeta(envelope.meta)
  ) {
    throw new Error('Response API phân trang không đúng envelope { data, meta }.');
  }
  return envelope as PagedResponse<T>;
}

/**
 * Lỗi API kèm nguyên văn Problem Details (RFC 7807) để phía UI map `errors` về từng
 * field và phân nhánh theo mã trong `detail` (vd `AUTH_EMAIL_EXISTS`).
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetails | null,
  ) {
    super(problem?.detail ?? problem?.title ?? `Yêu cầu thất bại: ${status}`);
    this.name = 'ApiError';
  }

  /** Mã lỗi nghiệp vụ backend trả trong `detail` (vd `AUTH_INVALID_CREDENTIALS`). */
  get code(): string | undefined {
    return this.problem?.detail;
  }

  /** Thông báo lỗi theo từng field, rỗng nếu backend không trả `errors`. */
  get fieldErrors(): Record<string, string[]> {
    return this.problem?.errors ?? {};
  }
}

/** Ném `ApiError` nếu response không thành công, ngược lại trả body đã bỏ envelope. */
export async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // Lỗi từ nginx/timeout không phải JSON — nuốt lỗi parse để vẫn giữ status thật.
    const problem = await res.json().catch(() => null);
    throw new ApiError(res.status, problem as ProblemDetails | null);
  }
  // 204 No Content (logout) không có body để parse.
  return res.status === 204 ? (undefined as T) : unwrap<T>(await res.json());
}

/** Giữ nguyên cả `data` và `meta` của response phân trang. */
export async function parsePaged<T>(res: Response): Promise<PagedResponse<T>> {
  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    throw new ApiError(res.status, problem as ProblemDetails | null);
  }
  return unwrapPaged<T>(await res.json());
}

export function buildUrl(path: string, params?: Record<string, string | number | undefined>): URL {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

/** Chuẩn bị header cho request JSON và multipart mà không phá boundary của FormData. */
export function requestHeaders(init: RequestInit = {}, accessToken?: string): Headers {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (
    init.body &&
    !(typeof FormData !== 'undefined' && init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return headers;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(buildUrl(path, params), {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  return parse<T>(res);
}

export async function apiGetPaged<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  init?: RequestInit,
): Promise<PagedResponse<T>> {
  const res = await fetch(buildUrl(path, params), {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  return parsePaged<T>(res);
}
