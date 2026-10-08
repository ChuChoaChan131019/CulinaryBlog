import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaModule } from '../../modules/media/media.module';
import { MailModule } from '../mail/mail.module';
import { RecipeImageCleanupProcessor } from './recipe-image-cleanup.processor';
import { RecipeImageCleanupQueue } from './recipe-image-cleanup.queue';
import { WelcomeEmailProcessor } from './welcome-email.processor';
import { WelcomeEmailQueue } from './welcome-email.queue';

@Module({
  imports: [ConfigModule, MailModule, MediaModule],
  providers: [
    RecipeImageCleanupQueue,
    RecipeImageCleanupProcessor,
    WelcomeEmailQueue,
    WelcomeEmailProcessor,
  ],
  exports: [RecipeImageCleanupQueue, WelcomeEmailQueue],
})
export class JobsModule {}
