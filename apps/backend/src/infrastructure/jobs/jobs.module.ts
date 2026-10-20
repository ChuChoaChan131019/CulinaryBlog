import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaModule } from '../../modules/media/media.module';
import { MailModule } from '../mail/mail.module';
import { RecipeImageCleanupProcessor } from './recipe-image-cleanup.processor';
import { RecipeImageCleanupQueue } from './recipe-image-cleanup.queue';
import { RecipeImageResizeProcessor } from './recipe-image-resize.processor';
import { RecipeImageResizeQueue } from './recipe-image-resize.queue';
import { RecipeImageVariantsService } from './recipe-image-variants.service';
import { SitemapController } from './sitemap.controller';
import { SitemapGenerationProcessor } from './sitemap-generation.processor';
import { SitemapGenerationQueue } from './sitemap-generation.queue';
import { SitemapGeneratorService } from './sitemap-generator.service';
import { WelcomeEmailProcessor } from './welcome-email.processor';
import { WelcomeEmailQueue } from './welcome-email.queue';
import { PasswordResetEmailProcessor } from './password-reset-email.processor';
import { PasswordResetEmailQueue } from './password-reset-email.queue';

@Module({
  imports: [ConfigModule, MailModule, MediaModule],
  controllers: [SitemapController],
  providers: [
    RecipeImageCleanupQueue,
    RecipeImageCleanupProcessor,
    RecipeImageResizeQueue,
    RecipeImageResizeProcessor,
    RecipeImageVariantsService,
    SitemapGenerationQueue,
    SitemapGenerationProcessor,
    SitemapGeneratorService,
    WelcomeEmailQueue,
    WelcomeEmailProcessor,
    PasswordResetEmailQueue,
    PasswordResetEmailProcessor,
  ],
  exports: [RecipeImageCleanupQueue, RecipeImageResizeQueue, WelcomeEmailQueue, PasswordResetEmailQueue],
})
export class JobsModule {}
