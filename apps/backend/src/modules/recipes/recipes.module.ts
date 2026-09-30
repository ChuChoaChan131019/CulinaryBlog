import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ArchiveRecipeHandler } from './commands/archive-recipe.handler';
import { CreateRecipeHandler } from './commands/create-recipe.handler';
import { PublishRecipeHandler } from './commands/publish-recipe.handler';
import { RecipeStatusService } from './commands/recipe-status.service';
import { UnpublishRecipeHandler } from './commands/unpublish-recipe.handler';
import { UpdateRecipeHandler } from './commands/update-recipe.handler';
import { RecipesController } from './recipes.controller';
import { GetRecipesHandler } from './queries/get-recipes.handler';

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
  controllers: [RecipesController],
  providers: [
    ArchiveRecipeHandler,
    CreateRecipeHandler,
    PublishRecipeHandler,
    UnpublishRecipeHandler,
    UpdateRecipeHandler,
    GetRecipesHandler,
    RecipeStatusService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],
})
export class RecipesModule {}
