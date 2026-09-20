import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from './media.controller';
import { FILE_STORAGE, FileStorageService } from './file-storage.service';
import { MinioFileStorageService } from './minio-file-storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [MediaController],
  providers: [
    MinioFileStorageService,
    { provide: FILE_STORAGE, useExisting: MinioFileStorageService },
    FileStorageService,
  ],
  exports: [FileStorageService, FILE_STORAGE],
})
export class MediaModule {}
