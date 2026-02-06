import { IsOptional, IsEnum, IsInt, IsArray, ValidateNested, IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DonationStatus, ItemCondition } from '@/database/entities';

export class CreateDonationItemDto {
  @ApiProperty({
    example: 'Gạo ST25',
    description: 'Item name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'kg',
    description: 'Unit of measure',
    required: false,
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Expiration date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiProperty({
    example: 'Quần áo',
    description: 'Item category',
  })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({
    example: 50,
    description: 'Quantity of items',
    type: 'integer',
  })
  @IsInt()
  quantity!: number;

  @ApiProperty({
    enum: ItemCondition,
    example: ItemCondition.GOOD,
    description: `Item condition: ${Object.values(ItemCondition).join(', ')}`,
    required: false,
  })
  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  @ApiProperty({
    example: ['https://example.com/item1.jpg', 'https://example.com/item2.jpg'],
    description: 'Image URLs',
    isArray: true,
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @ApiProperty({
    example: 'Quần áo mới, chưa qua sử dụng',
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  note?: string;
}

export class CreateDonationDto {
  @ApiProperty({
    type: CreateDonationItemDto,
    isArray: true,
    example: [
      {
        name: 'Áo phông cotton',
        unit: 'cái',
        expirationDate: '2026-12-31',
        category: 'Quần áo',
        quantity: 50,
        condition: 'GOOD',
        imageUrls: ['https://example.com/item1.jpg'],
        note: 'Quần áo mới, chưa qua sử dụng',
      },
      {
        name: 'Mì gói Hảo Hảo',
        unit: 'thùng',
        expirationDate: '2026-12-31',
        category: 'Thực phẩm',
        quantity: 10,
        condition: 'EXCELLENT',
        imageUrls: [],
        note: 'Mỗi thùng 30 gói',
      },
    ],
    description: 'List of items to donate',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDonationItemDto)
  items!: CreateDonationItemDto[];

  @ApiProperty({
    example: 'Donate for flood relief',
    description: 'Donation note',
    required: false,
  })
  @IsOptional()
  note?: string;
}

export class ApproveDonationDto {
  @ApiProperty({
    example: 'Approved - all items received in good condition',
    description: 'Approval note',
    required: false,
  })
  @IsOptional()
  note?: string;
}

export class RejectDonationDto {
  @ApiProperty({
    example: 'Some items are damaged or expired',
    description: 'Rejection reason',
  })
  reason!: string;
}

export class ListDonationsQueryDto {
  @ApiProperty({
    enum: DonationStatus,
    example: DonationStatus.SUBMITTED,
    description: 'Filter by donation status',
    required: false,
  })
  @IsOptional()
  @IsEnum(DonationStatus)
  status?: DonationStatus;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter by event ID',
    required: false,
  })
  @IsOptional()
  eventId?: string;

  @ApiProperty({
    example: '2026-01-01',
    description: 'From date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  from?: string;

  @ApiProperty({
    example: '2026-01-31',
    description: 'To date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  to?: string;

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

export class BulkFilterDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter by event ID',
    required: false,
  })
  @IsOptional()
  eventId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter by creator ID',
    required: false,
  })
  @IsOptional()
  creatorId?: string;

  @ApiProperty({
    example: '2026-01-01',
    description: 'From date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  from?: string;

  @ApiProperty({
    example: '2026-01-31',
    description: 'To date (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  to?: string;
}

export class BulkApproveDonationDto {
  @ApiProperty({
    description: 'List of donation IDs to approve',
    example: ['uuid-1', 'uuid-2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  ids?: string[];

  @ApiProperty({
    example: 'Approved via bulk action',
    description: 'Approval note',
    required: false,
  })
  @IsOptional()
  note?: string;
}

export class BulkRejectDonationDto {
  @ApiProperty({
    description: 'List of donation IDs to reject',
    example: ['uuid-1', 'uuid-2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  ids?: string[];

  @ApiProperty({
    example: 'Rejected via bulk action',
    description: 'Rejection reason',
  })
  reason!: string;
}
