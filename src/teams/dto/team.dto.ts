import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsInt,
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsNumber,
  Max,
  Min,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  AllocationStatus,
  TeamEquipmentStatus,
  TeamMemberRole,
  TeamMemberStatus,
  TeamRegistrationRequestStatus,
  TeamVehicleStatus,
} from '@/database/entities';

const transformBooleanValue = ({
  value,
  obj,
  key,
}: {
  value: unknown;
  obj: Record<string, unknown>;
  key: string;
}) => {
  const rawValue = obj?.[key] ?? value;

  if (typeof rawValue === 'boolean' || rawValue === undefined || rawValue === null) {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const normalizedValue = rawValue.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  return rawValue;
};

export class VehicleTypeResponseDto {
  @ApiProperty({ example: 'xe_cuu_thuong' })
  code!: string;

  @ApiProperty({ example: 'Xe cứu thương' })
  name!: string;

  @ApiPropertyOptional({ example: 'Xe chuyên dụng để sơ cứu và vận chuyển nạn nhân' })
  description?: string | null;

  @ApiProperty({ example: 4 })
  defaultCapacity!: number;
}

export class TeamEquipmentDto {
  @ApiProperty({
    example: 'Bộ sơ cứu',
    description: 'Equipment name',
  })
  @IsString()
  @IsNotEmpty()
  equipmentName!: string;

  @ApiProperty({
    example: 10,
    description: 'Equipment quantity',
    type: 'integer',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({
    enum: TeamEquipmentStatus,
    example: TeamEquipmentStatus.READY,
    description: 'Equipment status',
  })
  @IsOptional()
  @IsEnum(TeamEquipmentStatus)
  status?: TeamEquipmentStatus;
}

export class TeamVehicleDto {
  @ApiProperty({
    example: 'xe_cuu_thuong',
    description: 'Vehicle type code from vehicle master table',
  })
  @IsString()
  @IsNotEmpty()
  vehicleTypeCode!: string;

  @ApiProperty({
    example: '51A-12345',
    description: 'Vehicle plate number',
  })
  @IsString()
  @IsNotEmpty()
  plateNumber!: string;

  @ApiProperty({
    example: 4,
    description: 'Vehicle capacity',
    type: 'integer',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity!: number;

  @ApiPropertyOptional({
    enum: TeamVehicleStatus,
    example: TeamVehicleStatus.READY,
    description: 'Vehicle status',
  })
  @IsOptional()
  @IsEnum(TeamVehicleStatus)
  status?: TeamVehicleStatus;
}

export class CreateTeamMemberDto {
  @ApiProperty({
    example: 'alpha.member1@example.com',
    description: 'Login email for the team member account',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Member@123',
    description: 'Login password for the team member account',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: 'Nguyen Van B',
    description: 'Display name of the team member',
  })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiPropertyOptional({
    example: '0909123456',
    description: 'Phone number of the team member',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: '45 Le Loi, Quan 1, TP.HCM',
    description: 'Address of the team member',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    enum: TeamMemberRole,
    example: TeamMemberRole.MEMBER,
    description: 'Role of the member inside the team',
  })
  @IsOptional()
  @IsEnum(TeamMemberRole)
  role?: TeamMemberRole;

  @ApiPropertyOptional({
    enum: TeamMemberStatus,
    example: TeamMemberStatus.ACTIVE,
    description: 'Membership status inside the team',
  })
  @IsOptional()
  @IsEnum(TeamMemberStatus)
  status?: TeamMemberStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the login account should be active',
  })
  @IsOptional()
  @Transform(transformBooleanValue)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({
    example: 'Nguyen Van B',
    description: 'Display name of the team member',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiPropertyOptional({
    example: '0909123456',
    description: 'Phone number of the team member',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: '45 Le Loi, Quan 1, TP.HCM',
    description: 'Address of the team member',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    enum: TeamMemberRole,
    example: TeamMemberRole.MEMBER,
    description: 'Role of the member inside the team',
  })
  @IsOptional()
  @IsEnum(TeamMemberRole)
  role?: TeamMemberRole;

  @ApiPropertyOptional({
    enum: TeamMemberStatus,
    example: TeamMemberStatus.ON_LEAVE,
    description: 'Membership status inside the team',
  })
  @IsOptional()
  @IsEnum(TeamMemberStatus)
  status?: TeamMemberStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the login account should be active',
  })
  @IsOptional()
  @Transform(transformBooleanValue)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTeamRegistrationRequestDto {
  @ApiProperty({
    example: 'Đội cứu hộ dân sự Bình Thạnh',
    description: 'Proposed team name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 'Bình Thạnh, Phú Nhuận, Gò Vấp, TP.HCM',
    description: 'Proposed operating area',
  })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiProperty({
    example: 8,
    description: 'Expected initial team size',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teamSize!: number;

  @ApiPropertyOptional({
    example: 'Kho tập kết Bình Thạnh, TP.HCM',
    description: 'Base location of the proposed team',
  })
  @IsOptional()
  @IsString()
  baseLocation?: string;

  @ApiPropertyOptional({ example: 10.8035 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 106.7097 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    example: 'Nhóm tình nguyện cứu hộ tại địa phương, có kinh nghiệm ứng phó ngập lụt.',
    description: 'Additional description about the proposed team',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['first_aid', 'water_rescue'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ type: [TeamEquipmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamEquipmentDto)
  equipmentList?: TeamEquipmentDto[];

  @ApiPropertyOptional({ type: [TeamVehicleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamVehicleDto)
  vehicles?: TeamVehicleDto[];
}

export class ReviewTeamRegistrationRequestDto {
  @ApiProperty({
    enum: TeamRegistrationRequestStatus,
    example: TeamRegistrationRequestStatus.APPROVED,
    description: 'Approve or reject the team registration request',
  })
  @IsEnum(TeamRegistrationRequestStatus)
  status!: TeamRegistrationRequestStatus.APPROVED | TeamRegistrationRequestStatus.REJECTED;

  @ApiPropertyOptional({
    example: 'Đủ hồ sơ và phù hợp khu vực đang thiếu đội hỗ trợ.',
    description: 'Admin decision note',
  })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class CreateTeamDto {
  @ApiProperty({
    example: 'Đội cứu hộ Quận 1',
    description: 'Team name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Quận 1, TP.HCM',
    description: 'Area of responsibility',
    required: false,
  })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiProperty({
    example: 10,
    description: 'Number of team members',
    type: 'integer',
  })
  @Type(() => Number)
  @IsInt()
  teamSize!: number;

  @ApiPropertyOptional({
    example: 'Kho vận Quận 1, TP.HCM',
    description: 'Base location of the rescue team',
  })
  @IsOptional()
  @IsString()
  baseLocation?: string;

  @ApiPropertyOptional({
    example: 10.7769,
    description: 'Latitude of the rescue team base',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    example: 106.7009,
    description: 'Longitude of the rescue team base',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    example: 4.8,
    description: 'Team rating from 0 to 5',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['first_aid', 'trauma_care'],
    description: 'Team specialties',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({
    type: [TeamEquipmentDto],
    description: 'Equipment list of the rescue team',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamEquipmentDto)
  equipmentList?: TeamEquipmentDto[];

  @ApiPropertyOptional({
    type: [TeamVehicleDto],
    description: 'Vehicle list of the rescue team',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamVehicleDto)
  vehicles?: TeamVehicleDto[];

  @ApiProperty({
    example: 'team.q1@example.com',
    description: 'Login email for rescue team account',
  })
  @IsEmail()
  accountEmail!: string;

  @ApiProperty({
    example: 'Team@123',
    description: 'Login password for rescue team account',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  accountPassword!: string;

  @ApiProperty({
    example: 'Đội cứu hộ Quận 1',
    description: 'Display name for rescue team account profile',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountFullName?: string;
}

export class UpdateTeamDto {
  @ApiProperty({
    example: 'Đội cứu hộ Quận 1 - Updated',
    description: 'Team name',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Quận 1, Quận 2, TP.HCM',
    description: 'Area of responsibility',
    required: false,
  })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiProperty({
    example: 12,
    description: 'Number of team members',
    type: 'integer',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamSize?: number;

  @ApiPropertyOptional({
    example: 'Kho vận Quận 1, TP.HCM',
    description: 'Base location of the rescue team',
  })
  @IsOptional()
  @IsString()
  baseLocation?: string;

  @ApiPropertyOptional({
    example: 10.7769,
    description: 'Latitude of the rescue team base',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    example: 106.7009,
    description: 'Longitude of the rescue team base',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    example: 4.8,
    description: 'Team rating from 0 to 5',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['first_aid', 'trauma_care'],
    description: 'Team specialties',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({
    type: [TeamEquipmentDto],
    description: 'Equipment list of the rescue team',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamEquipmentDto)
  equipmentList?: TeamEquipmentDto[];

  @ApiPropertyOptional({
    type: [TeamVehicleDto],
    description: 'Vehicle list of the rescue team',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamVehicleDto)
  vehicles?: TeamVehicleDto[];

  @ApiProperty({
    example: true,
    description: 'Team active status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListTeamsQueryDto {
  @ApiProperty({
    example: true,
    description: 'Filter by active status',
    required: false,
  })
  @IsOptional()
  @Transform(transformBooleanValue)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 'Quận 1',
    description: 'Search by name or area',
    required: false,
  })
  @IsOptional()
  @IsString()
  q?: string;

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

export class ListMyTeamAllocationsQueryDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Filter allocations by event ID',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    enum: AllocationStatus,
    example: AllocationStatus.DISPATCHED,
    description: 'Filter allocations by status',
  })
  @IsOptional()
  @IsEnum(AllocationStatus)
  status?: AllocationStatus;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;
}
