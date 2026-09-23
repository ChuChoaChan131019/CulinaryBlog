import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RecipeDifficulty } from './create-recipe.dto';
import { UpdateRecipeDto } from './update-recipe.dto';

describe('UpdateRecipeDto', () => {
  it('chấp nhận cập nhật một phần và cho phép xóa giá trị dinh dưỡng', async () => {
    const dto = plainToInstance(UpdateRecipeDto, {
      title: 'Bánh mì thịt nướng mới',
      cookTime: 0,
      difficulty: RecipeDifficulty.Medium,
      nutrition: { calories: null, protein: 25.5 },
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('từ chối field không hợp lệ và nutrition rỗng', async () => {
    const dto = plainToInstance(UpdateRecipeDto, {
      title: 'Bún',
      categoryId: 'not-a-uuid',
      prepTime: 0,
      cookTime: -1,
      servings: 0,
      difficulty: 'Impossible',
      nutrition: {},
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'title',
        'categoryId',
        'prepTime',
        'cookTime',
        'servings',
        'difficulty',
        'nutrition',
      ]),
    );
  });
});
