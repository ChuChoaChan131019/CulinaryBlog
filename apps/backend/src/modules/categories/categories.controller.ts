import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CategoryDetailDto,
  CategoryDto,
  CreateCategoryRequest,
  CreatedCategoryDto,
} from '@culinary/shared';
import type { Response } from 'express';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCategoryCommand } from './commands/create-category.command';
import { DeleteCategoryCommand } from './commands/delete-category.command';
import { CreateCategoryDto } from './dto/create-category.dto';
import { GetCategoriesQuery } from './queries/get-categories.query';
import {
  GetCategoryBySlugQueryDto,
  GetCategoryBySlugQueryParams,
} from './dto/get-category-by-slug-query.dto';
import { GetCategoryBySlugQuery } from './queries/get-category-by-slug.query';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  getCategories(): Promise<CategoryDto[]> {
    return this.queryBus.execute(new GetCategoriesQuery());
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateCategoryDto,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        exceptionFactory: (errors) =>
          new UnprocessableEntityException({
            type: 'about:blank',
            title: 'Dữ liệu không hợp lệ',
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            detail: 'VALIDATION_ERROR',
            errors: Object.fromEntries(
              errors
                .filter((error) => error.constraints)
                .map((error) => [
                  error.property,
                  Object.values(error.constraints!),
                ]),
            ),
          }),
        transform: true,
        whitelist: true,
      }),
    )
    dto: CreateCategoryRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CreatedCategoryDto> {
    const result = await this.commandBus.execute<
      CreateCategoryCommand,
      CreatedCategoryDto
    >(new CreateCategoryCommand(dto.name, dto.description, dto.imageUrl));

    response.setHeader('Location', `/api/v1/categories/${result.slug}`);
    return result;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  async delete(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(new DeleteCategoryCommand(id, user));
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  getCategoryBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query(
      new ValidationPipe({
        expectedType: GetCategoryBySlugQueryDto,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
        whitelist: true,
      }),
    )
    query: GetCategoryBySlugQueryParams,
  ): Promise<CategoryDetailDto> {
    return this.queryBus.execute(new GetCategoryBySlugQuery(slug, query, user));
  }
}
