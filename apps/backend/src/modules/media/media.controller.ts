import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { FileStorageService } from './file-storage.service';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly fileStorage: FileStorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException({ type: 'VALIDATION_ERROR', detail: 'A file is required.' });
    return this.fileStorage.uploadAsync(file, 'uploads');
  }
}
