import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CategoriesController } from './categories.controller';
import { GetCategoriesHandler } from './queries/get-categories.handler';

@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [GetCategoriesHandler],
})
export class CategoriesModule {}
