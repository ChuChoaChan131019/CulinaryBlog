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
