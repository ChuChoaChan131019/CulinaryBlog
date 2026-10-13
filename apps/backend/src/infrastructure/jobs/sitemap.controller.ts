import { Controller, Get, NotFoundException, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FileStorageService } from '../../modules/media/file-storage.service';
import { SITEMAP_OBJECT_KEY } from './sitemap-generation.processor';

@ApiTags('sitemap')
@Controller('sitemap.xml')
export class SitemapController {
  constructor(private readonly storage: FileStorageService) {}

  @Get()
  async getSitemap(@Res() response: Response): Promise<void> {
    try {
      const content = await this.storage.readAsync(SITEMAP_OBJECT_KEY);
      response
        .status(200)
        .setHeader('Content-Type', 'application/xml; charset=utf-8')
        .send(content);
    } catch (error) {
      if (isMissingObjectError(error)) {
        throw new NotFoundException({
          type: 'SITEMAP_NOT_FOUND',
          detail: 'Sitemap has not been generated yet.',
        });
      }
      throw error;
    }
  }
}

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate.name === 'NoSuchKey' ||
    candidate.Code === 'NoSuchKey' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}
