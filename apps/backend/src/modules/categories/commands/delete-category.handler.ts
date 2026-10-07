import {
  ConflictException,
  ForbiddenException,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { and, eq, sql } from 'drizzle-orm';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  DATABASE_CONNECTION,
  Database,
} from '../../../infrastructure/database/database.module';
import { categories, recipes } from '../../../infrastructure/database/schema';
import { DeleteCategoryCommand } from './delete-category.command';

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<
  DeleteCategoryCommand,
  void
> {
  private readonly logger = new Logger(DeleteCategoryHandler.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    if (command.user.role !== 'Admin') {
      throw new ForbiddenException({
        type: 'CATEGORY_FORBIDDEN',
        title: 'Không có quyền xóa danh mục',
        status: 403,
        detail: 'Chỉ Admin được xóa danh mục',
      });
    }

    await this.db.transaction(async (tx) => {
      const [category] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, command.categoryId),
            eq(categories.isDeleted, false),
          ),
        )
        .for('update')
        .limit(1);

      if (!category) {
        throw new NotFoundException({
          type: 'CATEGORY_NOT_FOUND',
          title: 'Danh mục không tồn tại',
          status: 404,
          detail: 'Danh mục không tồn tại hoặc đã bị xóa',
        });
      }

      const [{ count }] = await tx
        .select({ count: sql<number>`count(${recipes.id})::int` })
        .from(recipes)
        .where(
          and(
            eq(recipes.categoryId, category.id),
            eq(recipes.isDeleted, false),
          ),
        );
      const recipeCount = Number(count);

      if (recipeCount > 0) {
        throw new ConflictException({
          type: 'CATEGORY_DELETE_HAS_RECIPES',
          title: 'Không thể xóa danh mục',
          status: 409,
          detail: `Danh mục còn chứa ${recipeCount} công thức.`,
        });
      }

      const [deleted] = await tx
        .update(categories)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
          rowVersion: sql`${categories.rowVersion} + 1`,
        })
        .where(
          and(
            eq(categories.id, category.id),
            eq(categories.isDeleted, false),
          ),
        )
        .returning({ id: categories.id });

      if (!deleted) {
        throw new NotFoundException({
          type: 'CATEGORY_NOT_FOUND',
          title: 'Danh mục không tồn tại',
          status: 404,
          detail: 'Danh mục không tồn tại hoặc đã bị xóa',
        });
      }
    });

    await this.cache.delete('categories:all');
    this.logger.log(
      `Xóa danh mục ${command.categoryId} bởi user ${command.user.id}`,
    );
  }
}
