import 'reflect-metadata';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  GetRecipesQueryDto,
  RecipeListDifficulty,
} from './get-recipes-query.dto';

describe('GetRecipesQueryDto', () => {
  it('áp dụng giá trị phân trang và sắp xếp mặc định', async () => {
    const dto = plainToInstance(GetRecipesQueryDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 1, pageSize: 12, sort: '-createdAt' });
  });

  it('chuyển query string sang số và chấp nhận bộ lọc hợp lệ', async () => {
    const dto = plainToInstance(GetRecipesQueryDto, {
      page: '2',
      pageSize: '24',
      categoryId: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
      difficulty: RecipeListDifficulty.Medium,
      maxCookTime: '45',
      sort: 'title',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.maxCookTime).toBe(45);
  });

  it('từ chối phân trang, bộ lọc và cách sắp xếp không hợp lệ', async () => {
    const dto = plainToInstance(GetRecipesQueryDto, {
      page: '0',
      pageSize: '51',
      categoryId: 'not-a-uuid',
      difficulty: 'Impossible',
      maxCookTime: '-1',
      sort: 'rating',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'page',
        'pageSize',
        'categoryId',
        'difficulty',
        'maxCookTime',
        'sort',
      ]),
    );
  });

  it('trả 422 cho query parameter không hợp lệ tại HTTP pipeline', async () => {
    const pipe = new ValidationPipe({
      expectedType: GetRecipesQueryDto,
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
