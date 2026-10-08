import { BadRequestException } from '@nestjs/common';
import {
  hasValidMagicBytes,
  MAX_FILE_SIZE,
  validateUpload,
  variantObjectKey,
} from './file-storage.service';

describe('file upload validation', () => {
  it('accepts valid PNG magic bytes', () => {
    expect(hasValidMagicBytes(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png')).toBe(true);
  });

  it('rejects a spoofed MIME type', () => {
    expect(() => validateUpload({ buffer: Buffer.from('not-an-image'), mimetype: 'image/png', size: 12 }))
      .toThrow(BadRequestException);
  });

  it('rejects files larger than 5MB', () => {
    expect(() => validateUpload({ buffer: Buffer.alloc(1), mimetype: 'image/png', size: MAX_FILE_SIZE + 1 }))
      .toThrow(BadRequestException);
  });

  it('tạo key deterministic cho các biến thể ảnh', () => {
    expect(variantObjectKey('recipes/recipe-1/image.jpg', 'medium')).toBe(
      'recipes/recipe-1/image-medium.webp',
    );
    expect(variantObjectKey('recipes/recipe-1/image.jpg', 'thumbnail')).toBe(
      'recipes/recipe-1/image-thumbnail.webp',
    );
  });
});
