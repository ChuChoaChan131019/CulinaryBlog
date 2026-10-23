import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import type { UserRole } from '@culinary/shared';

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['Author', 'Admin'], { message: 'role phải là Author hoặc Admin' })
  role?: UserRole;
}
