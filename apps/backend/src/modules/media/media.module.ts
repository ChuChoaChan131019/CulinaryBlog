import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MediaController } from './media.controller';
import { FILE_STORAGE, FileStorageService } from './file-storage.service';
import { MinioFileStorageService } from './minio-file-storage.service';
import { RecipeImagesService } from './recipe-images.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [MediaController],
  providers: [
    MinioFileStorageService,
    { provide: FILE_STORAGE, useExisting: MinioFileStorageService },
    FileStorageService,
    RecipeImagesService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [FileStorageService, FILE_STORAGE, RecipeImagesService],
})
export class MediaModule {}
