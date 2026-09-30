import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ProblemDetails } from '@culinary/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json(this.toProblemDetails(exception, status, request.url));
  }

  private toProblemDetails(exception: unknown, status: number, instance: string): ProblemDetails {
    if (!(exception instanceof HttpException)) {
      return { type: 'about:blank', title: 'Internal server error', status, instance };
    }

    const body = exception.getResponse();
    if (typeof body === 'string') {
      return { type: 'about:blank', title: body, status, instance };
    }

    const payload = body as Partial<ProblemDetails> & { message?: string; error?: string };
    return {
      type: payload.type ?? 'about:blank',
      title: payload.title ?? payload.error ?? payload.message ?? exception.message,
      status,
      detail: payload.detail,
      errors: payload.errors,
      instance,
    };
  }
}
