import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  // NFR-SEC-001: ≥8 ký tự, có hoa/thường/số/ký tự đặc biệt.
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message: 'password phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
  })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;
}
