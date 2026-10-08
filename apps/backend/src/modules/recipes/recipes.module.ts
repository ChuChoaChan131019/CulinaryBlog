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
import { RecipeIngredientsService } from './recipe-ingredients.service';
import { RecipeStepsService } from './recipe-steps.service';
import { RecipeDetailsService } from './recipe-details.service';
import { MediaModule } from '../media/media.module';
import { JobsModule } from '../../infrastructure/jobs/jobs.module';
import { DeleteRecipeHandler } from './commands/delete-recipe.handler';
import { RecipeImageUploadService } from './recipe-image-upload.service';

@Module({
  imports: [
    CqrsModule,
    MediaModule,
    JobsModule,
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
    DeleteRecipeHandler,
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
    RecipeImageUploadService,
    RecipeStepsService,
    RecipeDetailsService,
  ],
})
export class RecipesModule {}
