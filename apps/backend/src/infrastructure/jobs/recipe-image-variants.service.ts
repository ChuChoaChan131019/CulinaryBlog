import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { RecipeImageVariant } from '../../modules/media/file-storage.service';

export interface ImageVariant {
  variant: RecipeImageVariant;
  buffer: Buffer;
  contentType: 'image/webp';
}

@Injectable()
export class RecipeImageVariantsService {
  async create(source: Buffer): Promise<ImageVariant[]> {
    const image = sharp(source).rotate();
    const [medium, thumbnail] = await Promise.all([
      image.clone().resize(800, 600, { fit: 'cover', position: 'centre' }).webp({ quality: 80 }).toBuffer(),
      image.clone().resize(300, 300, { fit: 'cover', position: 'centre' }).webp({ quality: 80 }).toBuffer(),
    ]);

    return [
      { variant: 'medium', buffer: medium, contentType: 'image/webp' },
      { variant: 'thumbnail', buffer: thumbnail, contentType: 'image/webp' },
    ];
  }
}
