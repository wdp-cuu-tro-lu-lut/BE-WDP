import { IsOptional, IsEnum, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DonationStatus, ItemCondition } from '@/database/entities';

export class CreateDonationItemDto {
  @ApiProperty({
    example: 'Quần áo',
    description: 'Item category',
  })
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
        category: 'Quần áo',
        quantity: 50,
        condition: 'GOOD',
        imageUrls: ['https://example.com/item1.jpg'],
        note: 'Quần áo mới',
      },
      {
        category: 'Thực phẩm',
        quantity: 100,
        condition: 'EXCELLENT',
        imageUrls: [],
        note: 'Mì tôm',
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
