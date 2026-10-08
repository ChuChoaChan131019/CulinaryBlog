import {
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatedCategoryDto } from '@culinary/shared';
import { and, eq, sql } from 'drizzle-orm';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../../infrastructure/database/database.module';
import { categories } from '../../../infrastructure/database/schema';
import { UpdateCategoryCommand } from './update-category.command';

const CATEGORY_CACHE_KEY = 'categories:all';
const RECIPES_CACHE_KEY = 'recipes';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<
  UpdateCategoryCommand,
  UpdatedCategoryDto
> {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async execute(
    command: UpdateCategoryCommand,
  ): Promise<UpdatedCategoryDto> {
    if (command.user.role !== 'Admin') {
      throw new ForbiddenException({
        type: 'CATEGORY_FORBIDDEN',
        title: 'Không có quyền cập nhật danh mục',
        status: 403,
        detail: 'Chỉ Admin được cập nhật danh mục',
      });
    }

    const changes = command.changes;
    const hasDescription = Object.prototype.hasOwnProperty.call(
      changes,
      'description',
    );
    const hasImageUrl = Object.prototype.hasOwnProperty.call(
      changes,
      'imageUrl',
    );
    const hasOrderIndex = Object.prototype.hasOwnProperty.call(
      changes,
      'orderIndex',
    );

    try {
      const [updated] = await this.db
        .update(categories)
        .set({
          name: changes.name.trim(),
          ...(hasDescription && {
            description:
              changes.description === null
                ? null
                : changes.description?.trim() ?? null,
          }),
          ...(hasImageUrl && {
            imageUrl:
              changes.imageUrl === null
                ? null
                : changes.imageUrl?.trim() ?? null,
          }),
          ...(hasOrderIndex && { orderIndex: changes.orderIndex }),
          updatedAt: new Date(),
          rowVersion: sql`${categories.rowVersion} + 1`,
        })
        .where(
          and(
            eq(categories.id, command.categoryId),
            eq(categories.isDeleted, false),
          ),
        )
        .returning({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          imageUrl: categories.imageUrl,
          orderIndex: categories.orderIndex,
        });

      if (!updated) {
        throw new NotFoundException({
          type: 'CATEGORY_NOT_FOUND',
          title: 'Danh mục không tồn tại',
          status: 404,
          detail: 'Danh mục không tồn tại hoặc đã bị xóa',
        });
      }

      await Promise.all([
        this.cache.delete(CATEGORY_CACHE_KEY),
        this.cache.delete(RECIPES_CACHE_KEY),
      ]);

      return updated;
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          type: 'CATEGORY_NAME_EXISTS',
          title: 'Tên danh mục đã tồn tại',
          status: 409,
          detail: 'name đã tồn tại',
        });
      }
      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
