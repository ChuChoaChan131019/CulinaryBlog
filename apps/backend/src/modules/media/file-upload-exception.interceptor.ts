import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable()
export class FileUploadExceptionInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'LIMIT_FILE_SIZE') {
          return throwError(() => new BadRequestException({
            type: 'FILE_SIZE_EXCEEDED',
            detail: 'File size must not exceed 5MB.',
          }));
        }
        return throwError(() => error);
      }),
    );
  }
}
