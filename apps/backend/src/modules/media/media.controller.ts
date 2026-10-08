import { BadRequestException, Controller, Delete, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FileStorageService, UploadFile } from './file-storage.service';

@ApiTags('media')
@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Author', 'Admin')
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly fileStorage: FileStorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  upload(@UploadedFile() file?: UploadFile) {
    if (!file) throw new BadRequestException({ type: 'VALIDATION_ERROR', detail: 'A file is required.' });
    return this.fileStorage.uploadAsync(file, 'uploads');
  }

  @Delete()
  delete(@Query('key') key?: string) {
    if (!key) throw new BadRequestException({ type: 'VALIDATION_ERROR', detail: 'A file key is required.' });
    return this.fileStorage.deleteAsync(key);
  }
}
