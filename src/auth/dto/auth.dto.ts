import { IsEmail, IsNotEmpty, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address (optional, but email or phone required)',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Phone number - digits only, starting with 0 (optional, but email or phone required)',
    required: false,
  })
  @IsOptional()
  @Matches(/^0\d{9,10}$/, {
    message: 'Phone must be digits starting with 0 (10-11 digits total)',
  })
  phone?: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Password (minimum 6 characters)',
    minLength: 6,
  })
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Full name',
  })
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
    example: '123 Đường ABC, Quận 1, TP.HCM',
    description: 'Home address',
    required: false,
  })
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL',
    required: false,
  })
  @IsOptional()
  avatarUrl?: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address (or phone)',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Password',
  })
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token from previous login',
  })
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token to invalidate',
  })
  @IsNotEmpty()
  refreshToken!: string;
}
