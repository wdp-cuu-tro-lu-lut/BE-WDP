import { IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Nguyễn Văn A - Updated',
    description: 'Full name',
    required: false,
  })
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example: '123 Đường ABC, Quận 1, TP.HCM',
    description: 'Home address',
    required: false,
  })
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: 'https://example.com/new-avatar.jpg',
    description: 'Avatar URL',
    required: false,
  })
  @IsOptional()
  avatarUrl?: string;
}
