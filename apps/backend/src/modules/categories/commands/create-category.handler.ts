import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatedCategoryDto } from '@culinary/shared';
import { and, eq } from 'drizzle-orm';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../../infrastructure/database/database.module';
import { categories } from '../../../infrastructure/database/schema';
import {
  categorySlugBase,
  nextCategorySlugSuffix,
  withCategorySlugSuffix,
} from '../category-slug';
import { CreateCategoryCommand } from './create-category.command';

const CATEGORY_CACHE_KEY = 'categories:all';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<
  CreateCategoryCommand,
  CreatedCategoryDto
> {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<CreatedCategoryDto> {
    const name = command.name.trim();
    const description = command.description?.trim() || null;
    const imageUrl = command.imageUrl?.trim() || null;
    const [existingName] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.name, name), eq(categories.isDeleted, false)))
      .limit(1);

    if (existingName) throw this.nameExists();

    const base = categorySlugBase(name);
    let suffix = 0;

    while (true) {
      const slug = withCategorySlugSuffix(base, suffix);
      const [existingSlug] = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);

      if (existingSlug) {
        suffix = nextCategorySlugSuffix(suffix);
        continue;
      }

      try {
        const [created] = await this.db
          .insert(categories)
          .values({
            name,
            slug,
            description,
            imageUrl,
            status: true,
          })
          .returning({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            description: categories.description,
          });

        await this.cache.delete(CATEGORY_CACHE_KEY);
        return created;
      } catch (error: unknown) {
        if (this.isUniqueViolation(error, 'slug')) {
          suffix = nextCategorySlugSuffix(suffix);
          continue;
        }
        if (this.isUniqueViolation(error, 'name') || this.isUniqueViolation(error)) {
          throw this.nameExists();
        }
        throw error;
      }
    }
  }

  private isUniqueViolation(error: unknown, field?: 'name' | 'slug'): boolean {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== '23505'
    ) {
      return false;
    }

    if (!field) return !('constraint' in error);
    return 'constraint' in error && String(error.constraint).includes(field);
  }

  private nameExists(): ConflictException {
    return new ConflictException({
      type: 'CATEGORY_NAME_EXISTS',
      title: 'Tên danh mục đã tồn tại',
      status: 409,
      detail: 'name đã tồn tại',
    });
  }
}
