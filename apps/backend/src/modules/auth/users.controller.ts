import { Body, Controller, Get, HttpStatus, Param, ParseUUIDPipe, Patch, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PagedResult, UserListItemDto } from '@culinary/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateUserCommand } from './commands/update-user.command';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import type { GetUsersQueryParams } from './dto/get-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQuery } from './queries/get-users.query';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  list(
    @Query(new ValidationPipe({ expectedType: GetUsersQueryDto, errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY, transform: true, whitelist: true }))
    query: GetUsersQueryParams,
  ): Promise<PagedResult<UserListItemDto>> {
    return this.queryBus.execute(new GetUsersQuery(query));
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdateUserDto,
  ): Promise<UserListItemDto> {
    return this.commandBus.execute(new UpdateUserCommand(id, currentUser, dto));
  }
}
