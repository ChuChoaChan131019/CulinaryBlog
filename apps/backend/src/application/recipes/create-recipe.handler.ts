import {
  ConflictException,
  Inject,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RecipeSlug } from '../../domain/recipes/recipe-slug';
import { CACHE_PORT, CachePort } from '../ports/cache.port';
import { CreateRecipeCommand } from './create-recipe.command';
import { RECIPE_REPOSITORY, RecipeCreated, RecipeRepository } from './recipe.repository';

@CommandHandler(CreateRecipeCommand)
export class CreateRecipeHandler implements ICommandHandler<CreateRecipeCommand, RecipeCreated> {
  constructor(
    @Inject(RECIPE_REPOSITORY) private readonly recipes: RecipeRepository,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
  ) {}

  async execute(command: CreateRecipeCommand): Promise<RecipeCreated> {
    if (!(await this.recipes.categoryExists(command.categoryId))) {
      throw new UnprocessableEntityException({
        type: 'CATEGORY_NOT_FOUND',
        title: 'Danh mục không tồn tại',
        status: 422,
        detail: 'categoryId không trỏ tới danh mục hợp lệ',
      });
    }

    const slug = await this.createUniqueSlug(command.title);
    try {
      const result = await this.recipes.createDraft({ ...command, slug });
      await this.cache.delete('recipes');
      return result;
    } catch (error: unknown) {
      if (this.isSlugUniqueViolation(error)) {
        throw new ConflictException({
          type: 'RECIPE_SLUG_EXISTS',
          title: 'Slug công thức đã tồn tại',
          status: 409,
          detail: 'Không thể tạo slug duy nhất cho công thức',
        });
      }
      throw error;
    }
  }

  private async createUniqueSlug(title: string): Promise<string> {
    const base = RecipeSlug.fromTitle(title);
    let suffix = 0;
    while (true) {
      const candidate = RecipeSlug.withSuffix(base, suffix);
      if (!(await this.recipes.slugExists(candidate))) return candidate;
      suffix += 1;
    }
  }

  private isSlugUniqueViolation(error: unknown): boolean {
    if (
      typeof error !== 'object' || error === null ||
      !('code' in error) || error.code !== '23505'
    ) return false;
    return !('constraint' in error) || String(error.constraint).includes('slug');
  }
}
