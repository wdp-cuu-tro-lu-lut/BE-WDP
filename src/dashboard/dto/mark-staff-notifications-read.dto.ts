import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StaffNotificationCategory } from '@/database/entities';

export class MarkStaffNotificationsReadDto {
  @ApiProperty({
    enum: StaffNotificationCategory,
    example: StaffNotificationCategory.RESCUE_REQUESTS,
  })
  @IsEnum(StaffNotificationCategory)
  category!: StaffNotificationCategory;
}