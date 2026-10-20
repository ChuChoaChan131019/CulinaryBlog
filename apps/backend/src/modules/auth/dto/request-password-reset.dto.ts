import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ description: 'Email của tài khoản cần đặt lại mật khẩu' })
  @IsEmail()
  email!: string;
}
