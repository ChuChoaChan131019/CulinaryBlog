import 'reflect-metadata';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchRecipesQueryDto } from './search-recipes-query.dto';

describe('SearchRecipesQueryDto', () => {
  it('chuyển query hợp lệ sang kiểu dữ liệu API', async () => {
    const dto = plainToInstance(SearchRecipesQueryDto, {
      q: '  pho bo  ',
      page: '2',
      pageSize: '24',
      categoryId: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
      difficulty: 'Medium',
      maxCookTime: '45',
      minServings: '4',
      sort: 'title',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      q: 'pho bo',
      page: 2,
      pageSize: 24,
      maxCookTime: 45,
      minServings: 4,
      sort: 'title',
    });
  });

  it('từ chối từ khóa, phân trang, bộ lọc và sort không hợp lệ', async () => {
    const dto = plainToInstance(SearchRecipesQueryDto, {
      q: 'a',
      page: '0',
      pageSize: '51',
      categoryId: 'not-a-uuid',
      difficulty: 'Impossible',
      maxCookTime: '-1',
      minServings: '0',
      sort: 'rating',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'q',
        'page',
        'pageSize',
        'categoryId',
        'difficulty',
        'maxCookTime',
        'minServings',
        'sort',
      ]),
    );
  });

  it('trả 422 cho query không hợp lệ trong HTTP pipeline', async () => {
    const pipe = new ValidationPipe({
      expectedType: SearchRecipesQueryDto,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      transform: true,
      whitelist: true,
    });

    await expect(
      pipe.transform(
        { q: 'a' },
        { type: 'query', metatype: Object, data: undefined },
      ),
    ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
  });

  it('coi bộ lọc rỗng từ HTML form là không truyền', async () => {
    const dto = plainToInstance(SearchRecipesQueryDto, {
      q: 'pho',
      categoryId: '',
      difficulty: '',
      maxCookTime: '',
      minServings: '',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.categoryId).toBeUndefined();
    expect(dto.difficulty).toBeUndefined();
    expect(dto.maxCookTime).toBeUndefined();
    expect(dto.minServings).toBeUndefined();
  });
});
