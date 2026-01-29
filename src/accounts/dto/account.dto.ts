import { IsOptional, IsEnum, IsEmail, IsBoolean, MinLength, Matches, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountRole } from '@/database/entities';

export class CreateAccountDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email address (optional if phone provided)',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Phone number - digits only, starting with 0 (optional if email provided)',
    required: false,
  })
  @IsOptional()
  @Matches(/^0\d{9,10}$/, {
    message: 'Phone must be digits starting with 0 (10-11 digits total)',
  })
  phone?: string;

  @ApiProperty({
    example: 'Admin@123',
    description: 'Password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    enum: AccountRole,
    example: AccountRole.ADMIN,
    description: `Role: ${Object.values(AccountRole).join(', ')}`,
  })
  @IsEnum(AccountRole)
  role!: AccountRole;

  @ApiProperty({
    example: 'Nguyễn Quản Trị',
    description: 'Full name',
  })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
    example: '456 Đường XYZ, Quận 3, TP.HCM',
    description: 'Address',
    required: false,
  })
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: 'https://example.com/admin-avatar.jpg',
    description: 'Avatar URL',
    required: false,
  })
  @IsOptional()
  avatarUrl?: string;
}

export class UpdateAccountDto {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'Email address',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '0909876543',
    description: 'Phone number - digits only, starting with 0',
    required: false,
  })
  @IsOptional()
  @Matches(/^0\d{9,10}$/, {
    message: 'Phone must be digits starting with 0 (10-11 digits total)',
  })
  phone?: string;

  @ApiProperty({
    enum: AccountRole,
    example: AccountRole.STAFF,
    description: `Role: ${Object.values(AccountRole).join(', ')}`,
    required: false,
  })
  @IsOptional()
  @IsEnum(AccountRole)
  role?: AccountRole;

  @ApiProperty({
    example: 'Nguyễn Văn B',
    description: 'Full name',
    required: false,
  })
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example: '789 Đường ABC, Quận 5, TP.HCM',
    description: 'Address',
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

export class UpdateAccountStatusDto {
  @ApiProperty({
    example: true,
    description: 'Is account active',
  })
  @IsBoolean()
  isActive!: boolean;
}

export class ListAccountsQueryDto {
  @ApiProperty({
    enum: AccountRole,
    example: AccountRole.ADMIN,
    description: 'Filter by role',
    required: false,
  })
  @IsOptional()
  @IsEnum(AccountRole)
  role?: AccountRole;

  @ApiProperty({
    example: 'Nguyễn',
    description: 'Search by name, email, or phone',
    required: false,
  })
  @IsOptional()
  q?: string;

  @ApiProperty({
    example: true,
    description: 'Filter by active status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 1,
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  page: number = 1;

  @ApiProperty({
    example: 20,
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  limit: number = 20;

  @ApiProperty({
    example: 'createdAt',
    description: 'Sort by field',
    default: 'createdAt',
  })
  @IsOptional()
  sortBy: string = 'createdAt';

  @ApiProperty({
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    description: 'Sort order',
    default: 'DESC',
  })
  @IsOptional()
  order: 'ASC' | 'DESC' = 'DESC';
}
