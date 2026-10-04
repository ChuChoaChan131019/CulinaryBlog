import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { PagedResult } from '@culinary/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isPagedResult(value: unknown): value is PagedResult<unknown> {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Partial<PagedResult<unknown>>;
  return (
    Array.isArray(candidate.items) &&
    typeof candidate.totalCount === 'number' &&
    typeof candidate.page === 'number' &&
    typeof candidate.pageSize === 'number' &&
    typeof candidate.totalPages === 'number' &&
    typeof candidate.hasNextPage === 'boolean' &&
    typeof candidate.hasPreviousPage === 'boolean'
  );
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor<unknown, unknown> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((value: unknown) => this.wrap(value)));
  }

  private wrap(value: unknown): unknown {
    // Các endpoint 204 phải tiếp tục không có response body.
    if (value === undefined) return undefined;

    if (isPagedResult(value)) {
      return {
        data: value.items,
        meta: {
          totalCount: value.totalCount,
          page: value.page,
          pageSize: value.pageSize,
          totalPages: value.totalPages,
          hasNextPage: value.hasNextPage,
          hasPreviousPage: value.hasPreviousPage,
        },
      };
    }

    return { data: value };
  }
}
