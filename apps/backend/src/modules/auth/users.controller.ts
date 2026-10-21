import { Controller, Get, HttpStatus, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PagedResult, UserListItemDto } from '@culinary/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetUsersQueryDto, GetUsersQueryParams } from './dto/get-users-query.dto';
import { GetUsersQuery } from './queries/get-users.query';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  list(
    @Query(new ValidationPipe({ expectedType: GetUsersQueryDto, errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY, transform: true, whitelist: true }))
    query: GetUsersQueryParams,
  ): Promise<PagedResult<UserListItemDto>> {
    return this.queryBus.execute(new GetUsersQuery(query));
  }
}
