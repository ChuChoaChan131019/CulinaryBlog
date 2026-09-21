import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CATEGORY_REPOSITORY } from '../../application/categories/category.repository';
import { DrizzleCategoryRepository } from '../../infrastructure/database/repositories/drizzle-category.repository';
import { CategoriesController } from './categories.controller';
import { GetCategoriesHandler } from './queries/get-categories.handler';

@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [
    GetCategoriesHandler,
    DrizzleCategoryRepository,
    { provide: CATEGORY_REPOSITORY, useExisting: DrizzleCategoryRepository },
  ],
})
export class CategoriesModule {}
