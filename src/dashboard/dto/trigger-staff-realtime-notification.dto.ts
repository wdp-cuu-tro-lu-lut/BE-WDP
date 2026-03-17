import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum StaffRealtimeNotificationType {
  PENDING_DONATION_CREATED = 'PENDING_DONATION_CREATED',
  VOLUNTEER_REGISTRATION_CREATED = 'VOLUNTEER_REGISTRATION_CREATED',
  RESCUE_REQUEST_CREATED = 'RESCUE_REQUEST_CREATED',
  REPLENISHMENT_REQUEST_CREATED = 'REPLENISHMENT_REQUEST_CREATED',
}

export enum StaffRealtimeNotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export class TriggerStaffRealtimeNotificationDto {
  @ApiProperty({ enum: StaffRealtimeNotificationType })
  @IsEnum(StaffRealtimeNotificationType)
  type!: StaffRealtimeNotificationType;

  @ApiProperty({ example: 'Test cảnh báo realtime' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Đây là thông báo test từ backend.' })
  @IsString()
  message!: string;

  @ApiProperty({ enum: StaffRealtimeNotificationSeverity, example: 'warning' })
  @IsEnum(StaffRealtimeNotificationSeverity)
  severity!: StaffRealtimeNotificationSeverity;

  @ApiPropertyOptional({
    example: 7,
    description:
      'Khi type = PENDING_DONATION_CREATED, có thể truyền số pendingProductsCount để FE cập nhật badge/dashboard ngay.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  pendingProductsCount?: number;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Payload data tùy chỉnh. Nếu bỏ trống, backend sẽ tự sinh data mẫu.',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}