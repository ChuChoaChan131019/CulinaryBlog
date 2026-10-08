import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { UpdateCategoryCommand } from './update-category.command';
import { UpdateCategoryHandler } from './update-category.handler';

describe('UpdateCategoryHandler', () => {
  const categoryId = 'f8050eb8-9d4b-4ce6-a94f-68b590119185';
  const admin = {
    id: 'b5766939-6e3d-41cb-b652-84a185d9207f',
    email: 'admin@example.com',
    role: 'Admin' as const,
  };
  const author = { ...admin, role: 'Author' as const };
  const updated = {
    id: categoryId,
    name: 'Món Việt mới',
    slug: 'mon-viet',
    description: null,
    imageUrl: 'https://example.com/mon-viet.jpg',
    orderIndex: 2,
  };

  function buildHandler(result: unknown[] = [updated]) {
    const returning = jest.fn().mockResolvedValue(result);
    const updateWhere = jest.fn(() => ({ returning }));
    const updateSet = jest.fn((changes: Record<string, unknown>) => {
      void changes;
      return { where: updateWhere };
    });
    const update = jest.fn(() => ({ set: updateSet }));
    const db = { update };
    const cache = {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;

    return {
      handler: new UpdateCategoryHandler(db as never, cache),
      db,
      update,
      updateSet,
      returning,
      cache,
    };
  }

  it('cập nhật category, giữ nguyên slug và invalidate các cache liên quan', async () => {
    const { handler, updateSet, cache } = buildHandler();

    await expect(
      handler.execute(
        new UpdateCategoryCommand(categoryId, admin, {
          name: 'Món Việt mới',
          description: null,
          imageUrl: updated.imageUrl,
          orderIndex: 2,
        }),
      ),
    ).resolves.toEqual(updated);

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Món Việt mới',
        description: null,
        imageUrl: updated.imageUrl,
        orderIndex: 2,
        updatedAt: expect.any(Date),
      }),
    );
    expect(updateSet.mock.calls[0][0]).not.toHaveProperty('slug');
    expect(cache.delete).toHaveBeenCalledWith('categories:all');
    expect(cache.delete).toHaveBeenCalledWith('recipes');
  });

  it('giữ nguyên các trường tùy chọn khi request không gửi chúng', async () => {
    const { handler, updateSet } = buildHandler();

    await handler.execute(
      new UpdateCategoryCommand(categoryId, admin, { name: 'Tên mới' }),
    );

    expect(updateSet.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'Tên mới' }),
    );
    expect(updateSet.mock.calls[0][0]).not.toHaveProperty('description');
    expect(updateSet.mock.calls[0][0]).not.toHaveProperty('imageUrl');
    expect(updateSet.mock.calls[0][0]).not.toHaveProperty('orderIndex');
  });

  it('trả lỗi khi category không tồn tại hoặc đã bị xóa', async () => {
    const { handler, cache } = buildHandler([]);

    await expect(
      handler.execute(
        new UpdateCategoryCommand(categoryId, admin, { name: 'Tên mới' }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('trả lỗi phân quyền trước khi cập nhật', async () => {
    const { handler, db } = buildHandler();

    await expect(
      handler.execute(
        new UpdateCategoryCommand(categoryId, author, { name: 'Tên mới' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('trả CATEGORY_NAME_EXISTS khi tên bị trùng', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), {
      code: '23505',
    });
    const setup = buildHandler();
    setup.returning.mockRejectedValueOnce(duplicateError);

    await expect(
      setup.handler.execute(
        new UpdateCategoryCommand(categoryId, admin, { name: 'Tên trùng' }),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        type: 'CATEGORY_NAME_EXISTS',
        status: 409,
      }),
    });
    expect(setup.cache.delete).not.toHaveBeenCalled();
  });
});
