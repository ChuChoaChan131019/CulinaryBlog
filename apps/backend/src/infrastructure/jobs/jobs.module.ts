import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaModule } from '../../modules/media/media.module';
import { RecipeImageCleanupProcessor } from './recipe-image-cleanup.processor';
import { RecipeImageCleanupQueue } from './recipe-image-cleanup.queue';

@Module({
  imports: [ConfigModule, MediaModule],
  providers: [RecipeImageCleanupQueue, RecipeImageCleanupProcessor],
  exports: [RecipeImageCleanupQueue],
})
export class JobsModule {}
