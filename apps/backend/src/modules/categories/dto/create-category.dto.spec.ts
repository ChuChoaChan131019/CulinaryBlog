import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

describe('CreateCategoryDto', () => {
  it('trim tên và chấp nhận request hợp lệ', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: '  Món Việt  ',
      description: 'Món ăn gia đình',
      imageUrl: 'https://example.com/mon-viet.jpg',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Món Việt');
  });

  it('từ chối tên ngoài giới hạn, HTML và image URL không an toàn', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: '<script>alert(1)</script>',
      imageUrl: 'javascript:alert(1)',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['name', 'imageUrl']),
    );
  });
});
