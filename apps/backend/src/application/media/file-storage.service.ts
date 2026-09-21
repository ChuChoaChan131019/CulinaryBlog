import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';

export const FILE_STORAGE = Symbol('FILE_STORAGE');
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface StoredFile {
  url: string;
  key: string;
  contentType: string;
  size: number;
}

export interface IFileStorageService {
  uploadAsync(
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    folder: string,
  ): Promise<StoredFile>;
}

export const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export function hasValidMagicBytes(buffer: Buffer, mimetype: string): boolean {
  switch (mimetype) {
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case 'image/webp':
      return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    case 'image/avif': {
      if (buffer.length < 12 || buffer.toString('ascii', 4, 8) !== 'ftyp') return false;
      const brands = buffer.toString('ascii', 8, Math.min(buffer.length, 32));
      return brands.includes('avif') || brands.includes('avis');
    }
    default:
      return false;
  }
}

export function validateUpload(file: { buffer: Buffer; mimetype: string; size: number }): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException({ type: 'FILE_SIZE_EXCEEDED', detail: 'File size must not exceed 5MB.' });
  }
  if (!SUPPORTED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException({ type: 'FILE_MIME_INVALID', detail: 'Only JPEG, PNG, WebP and AVIF files are supported.' });
  }
  if (!hasValidMagicBytes(file.buffer, file.mimetype)) {
    throw new BadRequestException({ type: 'FILE_MIME_INVALID', detail: 'File content does not match its MIME type.' });
  }
}

@Injectable()
export class FileStorageService implements IFileStorageService {
  constructor(@Inject(FILE_STORAGE) private readonly storage: IFileStorageService) {}

  uploadAsync(
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    folder: string,
  ): Promise<StoredFile> {
    validateUpload(file);
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads';
    return this.storage.uploadAsync(file, safeFolder);
  }
}
