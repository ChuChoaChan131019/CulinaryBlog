export type SortOrder = 'asc' | 'desc';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Envelope chuẩn cho response thành công không phân trang. */
export interface ApiResponse<T> {
  data: T;
}

/** Metadata phân trang được tách khỏi danh sách dữ liệu ở HTTP boundary. */
export interface PaginationMeta {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Envelope chuẩn cho response danh sách phân trang. */
export interface PagedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/** RFC 7807 Problem Details */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  /** Field name -> validation messages */
  errors?: Record<string, string[]>;
  traceId?: string;
}
