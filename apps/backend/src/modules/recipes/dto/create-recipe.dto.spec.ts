import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRecipeDto, RecipeDifficulty } from './create-recipe.dto';

describe('CreateRecipeDto', () => {
  const validBody = {
    title: 'Bánh mì thịt nướng',
    description: 'Bánh mì Việt Nam',
    categoryId: 'f8050eb8-9d4b-4ce6-a94f-68b590119185',
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    difficulty: RecipeDifficulty.Medium,
    instructions: 'Nướng thịt rồi kẹp vào bánh mì',
    steps: [
      {
        stepNumber: 1,
        title: 'Nướng thịt',
        description: 'Nướng thịt đến khi chín vàng',
      },
    ],
    ingredients: [{ name: 'Thịt heo', quantity: 500, unit: 'g' }],
  };

  it('chấp nhận request hợp lệ và validate các object lồng nhau', async () => {
    const dto = plainToInstance(CreateRecipeDto, validBody);

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('từ chối title ngắn, categoryId sai và các giá trị số không dương', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      ...validBody,
      title: 'Bún',
      categoryId: 'not-a-uuid',
      prepTime: 0,
      cookTime: 0,
      servings: 0,
      difficulty: 'Impossible',
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
      ]),
    );
  });

  it('từ chối stepNumber bị trùng', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      ...validBody,
      steps: [
        validBody.steps[0],
        { ...validBody.steps[0], title: 'Hoàn thiện' },
      ],
    });

    const errors = await validate(dto);

    expect(errors).toEqual([expect.objectContaining({ property: 'steps' })]);
  });
});
