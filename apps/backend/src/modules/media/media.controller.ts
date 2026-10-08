import { BadRequestException, Controller, Delete, HttpCode, HttpStatus, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    if (!id) throw new BadRequestException({ type: 'VALIDATION_ERROR', detail: 'A file id is required.' });
    return this.fileStorage.deleteAsync(decodeURIComponent(id));
  }
}
