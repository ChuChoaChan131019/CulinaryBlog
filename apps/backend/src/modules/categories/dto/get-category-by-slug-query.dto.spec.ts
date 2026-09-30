import 'reflect-metadata';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetCategoryBySlugQueryDto } from './get-category-by-slug-query.dto';

describe('GetCategoryBySlugQueryDto', () => {
  it('áp dụng giá trị phân trang mặc định', async () => {
    const dto = plainToInstance(GetCategoryBySlugQueryDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 1, pageSize: 12 });
  });

  it('chuyển query string và từ chối phân trang ngoài giới hạn', async () => {
    const valid = plainToInstance(GetCategoryBySlugQueryDto, {
      page: '2',
      pageSize: '50',
    });
    const invalid = plainToInstance(GetCategoryBySlugQueryDto, {
      page: '0',
      pageSize: '51',
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'page' }),
        expect.objectContaining({ property: 'pageSize' }),
      ]),
    );
  });

  it('trả 422 cho query parameter không hợp lệ tại HTTP pipeline', async () => {
    const pipe = new ValidationPipe({
      expectedType: GetCategoryBySlugQueryDto,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      transform: true,
      whitelist: true,
    });

    await expect(
      pipe.transform(
        { page: '0' },
        { type: 'query', metatype: Object, data: undefined },
      ),
    ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
  });
});
