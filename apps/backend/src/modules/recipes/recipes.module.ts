import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRecipeHandler } from './commands/create-recipe.handler';
import { PublishRecipeHandler } from './commands/publish-recipe.handler';
import { RecipeStatusService } from './commands/recipe-status.service';
import { UnpublishRecipeHandler } from './commands/unpublish-recipe.handler';
import { UpdateRecipeHandler } from './commands/update-recipe.handler';
import { RecipesController } from './recipes.controller';
import { GetRecipesHandler } from './queries/get-recipes.handler';
import { RecipeIngredientsService } from './recipe-ingredients.service';

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
    CreateRecipeHandler,
    PublishRecipeHandler,
    UnpublishRecipeHandler,
    UpdateRecipeHandler,
    GetRecipesHandler,
    RecipeStatusService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
    RecipeIngredientsService,
  ],
})
export class RecipesModule {}
