import sharp from 'sharp';
import { RecipeImageVariantsService } from './recipe-image-variants.service';

describe('RecipeImageVariantsService', () => {
  it('tạo medium và thumbnail đúng kích thước', async () => {
    const source = await sharp({
      create: {
        width: 1_200,
        height: 900,
        channels: 3,
        background: { r: 220, g: 80, b: 60 },
      },
    })
      .jpeg()
      .toBuffer();
    const service = new RecipeImageVariantsService();

    const variants = await service.create(source);

    expect(variants.map((variant) => variant.variant)).toEqual([
      'medium',
      'thumbnail',
    ]);
    await expect(sharp(variants[0].buffer).metadata()).resolves.toMatchObject({
      width: 800,
      height: 600,
      format: 'webp',
    });
    await expect(sharp(variants[1].buffer).metadata()).resolves.toMatchObject({
      width: 300,
      height: 300,
      format: 'webp',
    });
  });
});
