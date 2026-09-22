import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtAuthGuard: JwtAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.headers.authorization) return true;

    try {
      return await this.jwtAuthGuard.canActivate(context);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
      return true;
    }
  }
}
