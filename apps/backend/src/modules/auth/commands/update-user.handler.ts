import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { UserListItemDto } from '@culinary/shared';
import { and, eq, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../infrastructure/database/database.module';
import { users } from '../../../infrastructure/database/schema';
import { UpdateUserCommand } from './update-user.command';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, UserListItemDto> {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async execute(command: UpdateUserCommand): Promise<UserListItemDto> {
    const [targetUser] = await this.db
      .select({
        id: users.id,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.id, command.userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException({
        type: 'USER_NOT_FOUND',
        title: 'Người dùng không tồn tại',
        status: 404,
        detail: 'Tài khoản người dùng không tồn tại hoặc đã bị xóa',
      });
    }

    const isSelf = command.userId === command.currentUser.id;

    if (isSelf && command.dto.isActive === false) {
      throw new BadRequestException({
        type: 'AUTH_CANNOT_DEACTIVATE_SELF',
        title: 'Không thể tự vô hiệu hóa tài khoản',
        status: 400,
        detail: 'Bạn không thể tự khóa tài khoản quản trị viên của chính mình',
      });
    }

    if (isSelf && command.dto.role && command.dto.role !== 'Admin') {
      throw new BadRequestException({
        type: 'AUTH_CANNOT_DEMOTE_SELF',
        title: 'Không thể tự hạ quyền quản trị',
        status: 400,
        detail: 'Bạn không thể tự hạ quyền Admin của chính mình',
      });
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date(),
      rowVersion: sql`${users.rowVersion} + 1`,
    };

    if (command.dto.isActive !== undefined) {
      patch.isActive = command.dto.isActive;
      if (command.dto.isActive) {
        patch.lockedUntil = null;
        patch.failedLoginAttempts = 0;
      }
    }

    if (command.dto.role) {
      patch.role = command.dto.role;
    }

    const [updated] = await this.db
      .update(users)
      .set(patch)
      .where(and(eq(users.id, command.userId), eq(users.isDeleted, false)))
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      roles: [updated.role],
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
