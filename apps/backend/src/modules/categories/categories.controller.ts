import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { CategoryDto } from '@culinary/shared';
import { GetCategoriesQuery } from './queries/get-categories.query';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  getCategories(): Promise<CategoryDto[]> {
    return this.queryBus.execute(new GetCategoriesQuery());
  }
}
