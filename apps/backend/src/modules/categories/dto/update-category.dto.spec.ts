import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCategoryDto } from './update-category.dto';

describe('UpdateCategoryDto', () => {
  it('trim tên và chấp nhận các trường cập nhật hợp lệ', async () => {
    const dto = plainToInstance(UpdateCategoryDto, {
      name: '  Món Việt mới  ',
      description: null,
      imageUrl: 'https://example.com/mon-viet.jpg',
      orderIndex: 2,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Món Việt mới');
  });
});
