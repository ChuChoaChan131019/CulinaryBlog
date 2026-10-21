import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { UserListSort, UserRole } from '@culinary/shared';

const USER_LIST_SORT_VALUES: UserListSort[] = [
  'createdAt',
  '-createdAt',
  'email',
  '-email',
  'displayName',
  '-displayName',
];

export class GetUsersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;

  @IsOptional()
  @IsEnum(['Author', 'Admin'] as const)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(USER_LIST_SORT_VALUES)
  sort: UserListSort = '-createdAt';
}

export interface GetUsersQueryParams {
  page: number;
  pageSize: number;
  role?: UserRole;
  q?: string;
  sort: UserListSort;
}
