import { IsOptional, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ItemCondition } from '@/database/entities';

export class CreateReceiptDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Donation ID to create receipt from',
  })
  donationId!: string;
}

export class AllocationItemInputDto {
  @ApiProperty({
    example: 'Quần áo',
    description: 'Item category',
  })
  category!: string;

  @ApiProperty({
    enum: ItemCondition,
    example: ItemCondition.GOOD,
    description: `Item condition: ${Object.values(ItemCondition).join(', ')}`,
  })
  condition!: ItemCondition;

  @ApiProperty({
    example: 30,
    description: 'Quantity to allocate',
    type: 'integer',
  })
  @IsInt()
  quantity!: number;
}

export class CreateAllocationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Team ID receiving the allocation',
  })
  teamId!: string;

  @ApiProperty({
    type: AllocationItemInputDto,
    isArray: true,
    example: [
      {
        category: 'Quần áo',
        condition: 'GOOD',
        quantity: 30,
      },
      {
        category: 'Thực phẩm',
        condition: 'EXCELLENT',
        quantity: 50,
      },
    ],
    description: 'List of items to allocate',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationItemInputDto)
  items!: AllocationItemInputDto[];
}

export class UpdateAllocationStatusDto {
  @ApiProperty({
    example: 'DELIVERED',
    description: 'Allocation status (e.g., PENDING, DELIVERED, RETURNED)',
  })
  status!: string;
}

export class ListAllocationsQueryDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Filter by team ID',
    required: false,
  })
  @IsOptional()
  teamId?: string;

  @ApiProperty({
    example: 'DELIVERED',
    description: 'Filter by allocation status',
    required: false,
  })
  @IsOptional()
  status?: string;

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
}
