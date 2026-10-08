import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaModule } from '../../modules/media/media.module';
import { MailModule } from '../mail/mail.module';
import { RecipeImageCleanupProcessor } from './recipe-image-cleanup.processor';
import { RecipeImageCleanupQueue } from './recipe-image-cleanup.queue';
import { RecipeImageResizeProcessor } from './recipe-image-resize.processor';
import { RecipeImageResizeQueue } from './recipe-image-resize.queue';
import { RecipeImageVariantsService } from './recipe-image-variants.service';
import { WelcomeEmailProcessor } from './welcome-email.processor';
import { WelcomeEmailQueue } from './welcome-email.queue';

@Module({
  imports: [ConfigModule, MailModule, MediaModule],
  providers: [
    RecipeImageCleanupQueue,
    RecipeImageCleanupProcessor,
    RecipeImageResizeQueue,
    RecipeImageResizeProcessor,
    RecipeImageVariantsService,
    WelcomeEmailQueue,
    WelcomeEmailProcessor,
  ],
  exports: [RecipeImageCleanupQueue, RecipeImageResizeQueue, WelcomeEmailQueue],
})
export class JobsModule {}
