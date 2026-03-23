import {
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsInt,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  AllocationStatus,
  RescueSupplyOrderStatus,
  WarehouseTransactionSource,
  WarehouseTransactionType,
} from '@/database/entities';
import { ItemCondition } from '@/database/entities/warehouse-stock.entity';

export class CreateReceiptDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Donation ID to create receipt from',
  })
  @IsUUID()
  donationId!: string;
}

export class CreateManualStockEntryItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440101',
    description: 'Category ID nhập kho',
  })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    enum: ItemCondition,
    example: ItemCondition.GOOD,
    description: `Tình trạng vật phẩm: ${Object.values(ItemCondition).join(', ')}`,
  })
  @IsEnum(ItemCondition)
  condition!: ItemCondition;

  @ApiProperty({
    example: 25,
    description: 'Số lượng nhập kho',
    type: 'integer',
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateManualStockEntryDto {
  @ApiProperty({
    example: 'PO-2026-0001',
    description: 'Mã tham chiếu chứng từ nhập tay',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  referenceCode?: string;

  @ApiProperty({
    example: 'Nhập tay hàng mua ngoài để bổ sung kho trung tâm',
    description: 'Ghi chú nhập kho',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    type: CreateManualStockEntryItemDto,
    isArray: true,
    example: [
      {
        categoryId: '550e8400-e29b-41d4-a716-446655440101',
        condition: 'GOOD',
        quantity: 25,
      },
    ],
    description: 'Danh sách vật phẩm admin nhập tay vào kho',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateManualStockEntryItemDto)
  items!: CreateManualStockEntryItemDto[];
}

export class AllocationItemInputDto {
  @ApiProperty({
    example: 'Quần áo',
    description: 'Item category',
  })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({
    enum: ItemCondition,
    example: ItemCondition.GOOD,
    description: `Item condition: ${Object.values(ItemCondition).join(', ')}`,
  })
  @IsEnum(ItemCondition)
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
  @IsUUID()
  teamId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Donation ID associated with this allocation (optional)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  donationId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Event ID associated with this allocation (optional)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;

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
  @IsEnum(AllocationStatus)
  status!: AllocationStatus;
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
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Filter by event ID',
    required: false,
  })
  @IsOptional()
  eventId?: string;

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

export class CreateRescueSupplyOrderDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'Rescue request ID đã được admin đánh giá và phân công',
  })
  @IsUUID()
  rescueRequestId!: string;

  @ApiProperty({
    example: 12,
    description: 'Số người thiệt hại thực tế dùng để tính phiếu',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedPeople?: number;

  @ApiProperty({
    example: 'Phiếu cấp phát lần 1 cho đợt cứu trợ này',
    description: 'Ghi chú nội bộ của staff',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateRescueSupplyTeamHandoffItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440012',
    description: 'ID item của phiếu vật phẩm rescue order',
  })
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({
    example: 6,
    description: 'Số lượng staff bàn giao cho team ở đợt này',
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateRescueSupplyTeamHandoffDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440099',
    description: 'Assignment ID của team sẽ nhận vật phẩm',
  })
  @IsUUID()
  assignmentId!: string;

  @ApiProperty({
    example: 'Bàn giao đợt 1 cho đội số 2 tại điểm tập kết',
    description: 'Ghi chú bàn giao nội bộ',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    type: CreateRescueSupplyTeamHandoffItemDto,
    isArray: true,
    description: 'Danh sách vật phẩm staff bàn giao cho team',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateRescueSupplyTeamHandoffItemDto)
  items!: CreateRescueSupplyTeamHandoffItemDto[];
}

export class ListRescueSupplyOrdersQueryDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'Lọc theo rescue request',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  rescueRequestId?: string;

  @ApiProperty({
    enum: RescueSupplyOrderStatus,
    example: RescueSupplyOrderStatus.READY,
    description: 'Lọc theo trạng thái phiếu vật phẩm',
    required: false,
  })
  @IsOptional()
  @IsEnum(RescueSupplyOrderStatus)
  status?: RescueSupplyOrderStatus;

  @ApiProperty({ example: 1, default: 1, required: false })
  @IsOptional()
  page: number = 1;

  @ApiProperty({ example: 20, default: 20, required: false })
  @IsOptional()
  limit: number = 20;
}

export class CreateRescueReplenishmentRequestDto {
  @ApiProperty({
    example: 'Kho đang thiếu 8 nước uống và 2 bộ y tế, đề nghị bổ sung gấp',
    description: 'Ghi chú staff gửi admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ReviewReplenishmentRequestItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440011',
    description: 'ID item của yêu cầu bổ sung',
  })
  @IsUUID()
  itemId!: string;

  @ApiProperty({
    example: 8,
    description: 'Số lượng admin duyệt nhập thêm',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  approvedQuantity?: number;

  @ApiProperty({
    enum: ItemCondition,
    example: ItemCondition.EXCELLENT,
    description: 'Condition của hàng nhập bổ sung',
    required: false,
  })
  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;
}

export class ReviewReplenishmentRequestDto {
  @ApiProperty({
    example: true,
    description: 'true = admin duyệt, false = từ chối',
  })
  @IsBoolean()
  approved!: boolean;

  @ApiProperty({
    example: 'Đã duyệt nhập thêm từ kho dự phòng',
    description: 'Ghi chú phê duyệt / từ chối',
    required: false,
  })
  @IsOptional()
  @IsString()
  decisionNote?: string;

  @ApiProperty({
    type: ReviewReplenishmentRequestItemDto,
    isArray: true,
    required: false,
    description: 'Cho phép admin điều chỉnh số lượng/condition từng item',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewReplenishmentRequestItemDto)
  items?: ReviewReplenishmentRequestItemDto[];
}

export class CompleteRescueSupplyOrderItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440012',
    description: 'ID item của phiếu vật phẩm',
  })
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({
    example: 3,
    description: 'Số lượng vật phẩm còn dư trả lại kho',
  })
  @IsInt()
  @Min(0)
  returnedQuantity!: number;

  @ApiProperty({
    enum: ItemCondition,
    example: ItemCondition.GOOD,
    description: 'Condition hàng hoàn kho',
    required: false,
  })
  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;
}

export class CompleteRescueSupplyOrderDto {
  @ApiProperty({
    example: 'Hoàn tất cứu trợ, còn dư 3 thùng nước hoàn kho',
    description: 'Ghi chú chốt phiếu',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    type: CompleteRescueSupplyOrderItemDto,
    isArray: true,
    required: false,
    description: 'Danh sách vật phẩm hoàn kho nếu còn dư',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteRescueSupplyOrderItemDto)
  items?: CompleteRescueSupplyOrderItemDto[];
}

export class ListWarehouseTransactionsQueryDto {
  @ApiProperty({
    enum: WarehouseTransactionSource,
    example: WarehouseTransactionSource.RESCUE_DISPATCH,
    required: false,
  })
  @IsOptional()
  @IsEnum(WarehouseTransactionSource)
  source?: WarehouseTransactionSource;

  @ApiProperty({
    enum: WarehouseTransactionType,
    example: WarehouseTransactionType.OUT,
    required: false,
  })
  @IsOptional()
  @IsEnum(WarehouseTransactionType)
  type?: WarehouseTransactionType;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440013',
    required: false,
    description: 'Lọc theo category',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    example: '2026-03-01',
    required: false,
    description: 'Lọc từ ngày',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({
    example: '2026-03-31',
    required: false,
    description: 'Lọc đến ngày',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ example: 1, default: 1, required: false })
  @IsOptional()
  page: number = 1;

  @ApiProperty({ example: 20, default: 20, required: false })
  @IsOptional()
  limit: number = 20;
}
