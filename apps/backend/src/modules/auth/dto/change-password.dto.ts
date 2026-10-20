import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại của người dùng' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'Mật khẩu mới (ít nhất 8 ký tự, có hoa, thường, số và ký tự đặc biệt)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message: 'newPassword phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
  })
  newPassword!: string;
}
