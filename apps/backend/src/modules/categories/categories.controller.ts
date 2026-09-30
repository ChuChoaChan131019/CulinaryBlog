import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoryDetailDto, CategoryDto } from '@culinary/shared';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { GetCategoriesQuery } from './queries/get-categories.query';
import {
  GetCategoryBySlugQueryDto,
  GetCategoryBySlugQueryParams,
} from './dto/get-category-by-slug-query.dto';
import { GetCategoryBySlugQuery } from './queries/get-category-by-slug.query';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  getCategories(): Promise<CategoryDto[]> {
    return this.queryBus.execute(new GetCategoriesQuery());
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
