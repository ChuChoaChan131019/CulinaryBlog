import { Test } from '@nestjs/testing';
import { GetCategoriesHandler } from './application/categories/get-categories.handler';
import { RegisterHandler } from './application/auth/register.handler';
import { CreateRecipeHandler } from './application/recipes/create-recipe.handler';
import { GetRecipesHandler } from './application/recipes/get-recipes.handler';
import { AppModule } from './app.module';

describe('AppModule dependency wiring', () => {
  it('resolves CQRS handlers with their repository and service ports', async () => {
    const values = {
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'test-only-access-secret',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_PUBLIC_URL: 'http://localhost:9000',
      S3_ACCESS_KEY: 'test',
      S3_SECRET_KEY: 'test',
    };
    const previous = Object.fromEntries(
      Object.keys(values).map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, values);
    try {
      const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
      expect(module.get(GetCategoriesHandler, { strict: false })).toBeDefined();
      expect(module.get(GetRecipesHandler, { strict: false })).toBeDefined();
      expect(module.get(CreateRecipeHandler, { strict: false })).toBeDefined();
      expect(module.get(RegisterHandler, { strict: false })).toBeDefined();
      await module.close();
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
