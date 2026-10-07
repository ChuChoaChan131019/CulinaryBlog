import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaModule } from '../../modules/media/media.module';
import { RecipeImageCleanupProcessor } from './recipe-image-cleanup.processor';
import { RecipeImageCleanupQueue } from './recipe-image-cleanup.queue';
import { RecipeImageResizeProcessor } from './recipe-image-resize.processor';
import { RecipeImageResizeQueue } from './recipe-image-resize.queue';
import { RecipeImageVariantsService } from './recipe-image-variants.service';

@Module({
  imports: [ConfigModule, MediaModule],
  providers: [
    RecipeImageCleanupQueue,
    RecipeImageCleanupProcessor,
    RecipeImageResizeQueue,
    RecipeImageResizeProcessor,
    RecipeImageVariantsService,
  ],
  exports: [RecipeImageCleanupQueue, RecipeImageResizeQueue],
})
export class JobsModule {}
