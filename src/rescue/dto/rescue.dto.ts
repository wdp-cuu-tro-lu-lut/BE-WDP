import { IsOptional, IsEnum, IsNumber, IsString, IsNotEmpty, IsArray, IsUUID, ArrayNotEmpty, IsPhoneNumber, MaxLength, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RescuePriority, RescueStatus, AssignmentStatus } from '@/database/entities';

export class CreateRescueRequestDto {
  @ApiProperty({
    example: '123 Đường ABC, Quận 1, TP.HCM',
    description: 'Rescue location address',
  })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({
    example: 10.7769,
    description: 'Latitude coordinate',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    example: 106.6966,
    description: 'Longitude coordinate',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    enum: RescuePriority,
    example: RescuePriority.HIGH,
    description: `Priority level: ${Object.values(RescuePriority).join(', ')}`,
    required: false,
  })
  @IsOptional()
  @IsEnum(RescuePriority)
  priority?: RescuePriority;

  @ApiProperty({
    example: 'Người bị mắc kẹt trong lũ',
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    example: 5,
    description: 'Ước lượng số người bị ảnh hưởng / cần cứu trợ',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedPeople?: number;
}

/**
 * DTO cho guest (chưa đăng nhập) gửi yêu cầu cứu trợ khẩn cấp.
 * Bắt buộc phải cung cấp tên + SĐT để liên lạc.
 */
export class CreateGuestRescueRequestDto {
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Tên người gửi yêu cầu (chưa đăng nhập)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  guestName!: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại liên lạc',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  guestPhone!: string;

  @ApiProperty({
    example: '123 Đường ABC, Quận 1, TP.HCM',
    description: 'Rescue location address',
  })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({
    example: 10.7769,
    description: 'Latitude coordinate',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    example: 106.6966,
    description: 'Longitude coordinate',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    enum: RescuePriority,
    example: RescuePriority.HIGH,
    description: `Priority level: ${Object.values(RescuePriority).join(', ')}`,
    required: false,
  })
  @IsOptional()
  @IsEnum(RescuePriority)
  priority?: RescuePriority;

  @ApiProperty({
    example: 'Người bị mắc kẹt trong lũ, cần cứu gấp',
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    example: 10,
    description: 'Ước lượng số người bị ảnh hưởng / cần cứu trợ',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedPeople?: number;
}

/**
 * DTO cho user đã đăng nhập "nhận lại" rescue request mà trước đó gửi khi chưa login.
 * Đối chiếu bằng SĐT.
 */
export class ClaimRescueRequestDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại đã dùng khi gửi yêu cầu lúc chưa đăng nhập',
  })
  @IsString()
  @IsNotEmpty()
  guestPhone!: string;
}

export class ReviewRescueRequestDto {
  @ApiProperty({
    enum: RescueStatus,
    example: RescueStatus.REVIEWED,
    description: `Status: ${Object.values(RescueStatus).join(', ')}`,
  })
  @IsEnum(RescueStatus)
  status!: RescueStatus;

  @ApiProperty({
    enum: RescuePriority,
    example: RescuePriority.CRITICAL,
    description: 'Update priority level',
    required: false,
  })
  @IsOptional()
  @IsEnum(RescuePriority)
  priority?: RescuePriority;

  @ApiProperty({
    example: 3,
    description: 'Số team cần thiết cho request này (admin đánh giá)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  requiredTeams?: number;

  @ApiProperty({
    example: 'Approved - dispatching nearest team',
    description: 'Review note',
    required: false,
  })
  @IsOptional()
  note?: string;
}

export class CreateRescueAssignmentDto {
  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    description: 'List of team IDs to assign',
    isArray: true,
    type: 'string',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  teamIds!: string[];
}

export class RespondAssignmentDto {
  @ApiProperty({
    enum: AssignmentStatus,
    example: AssignmentStatus.ACCEPTED,
    description: `Response status: ${Object.values(AssignmentStatus).join(', ')}`,
  })
  @IsEnum(AssignmentStatus)
  status!: AssignmentStatus;
}

export class UpdateProgressDto {
  @ApiProperty({
    enum: RescueStatus,
    example: RescueStatus.IN_PROGRESS,
    description: `Rescue status: ${Object.values(RescueStatus).join(', ')}`,
  })
  @IsEnum(RescueStatus)
  status!: RescueStatus;

  @ApiProperty({
    example: 'Team arrived at location, assessing situation',
    description: 'Progress update note',
    required: false,
  })
  @IsOptional()
  progressNote?: string;
}

export class ListRescueRequestsQueryDto {
  @ApiProperty({
    enum: RescueStatus,
    example: RescueStatus.NEW,
    description: 'Filter by status',
    required: false,
  })
  @IsOptional()
  @IsEnum(RescueStatus)
  status?: RescueStatus;

  @ApiProperty({
    enum: RescuePriority,
    example: RescuePriority.HIGH,
    description: 'Filter by priority',
    required: false,
  })
  @IsOptional()
  @IsEnum(RescuePriority)
  priority?: RescuePriority;

  @ApiProperty({
    enum: ['true', 'false'],
    example: 'false',
    description: 'Lọc theo trạng thái phân công: true = đã phân công, false = chưa phân công',
    required: false,
  })
  @IsOptional()
  assigned?: string;

  @ApiProperty({
    example: 'Quận 1',
    description: 'Search by address',
    required: false,
  })
  @IsOptional()
  q?: string;

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

export class ListAssignmentsQueryDto {
  @ApiProperty({
    enum: AssignmentStatus,
    example: AssignmentStatus.SENT,
    description: 'Filter by status',
    required: false,
  })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

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
