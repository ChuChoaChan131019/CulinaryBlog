import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCategoryHandler } from './commands/create-category.handler';
import { DeleteCategoryHandler } from './commands/delete-category.handler';
import { CategoriesController } from './categories.controller';
import { GetCategoriesHandler } from './queries/get-categories.handler';
import { GetCategoryBySlugHandler } from './queries/get-category-by-slug.handler';

@Module({
  imports: [
    CqrsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [CategoriesController],
  providers: [
    CreateCategoryHandler,
    DeleteCategoryHandler,
    GetCategoriesHandler,
    GetCategoryBySlugHandler,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],
})
export class CategoriesModule {}
