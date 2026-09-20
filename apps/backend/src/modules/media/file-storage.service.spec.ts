import { BadRequestException } from '@nestjs/common';
import { hasValidMagicBytes, MAX_FILE_SIZE, validateUpload } from './file-storage.service';

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
});
