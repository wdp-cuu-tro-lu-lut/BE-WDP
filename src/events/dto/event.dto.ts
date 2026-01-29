import { IsOptional, IsEnum, IsString, IsNotEmpty, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { EventType, EventStatus } from '@/database/entities';

export class CreateEventDto {
  @ApiProperty({
    example: 'Sự kiện quyên góp lũ lụt 2026',
    description: 'Event title',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'Quyên góp cho các nạn nhân bị ảnh hưởng bởi lũ lụt miền Trung',
    description: 'Event description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: EventType,
    example: EventType.DONATION,
    description: `Event type: ${Object.values(EventType).join(', ')}`,
  })
  @IsEnum(EventType)
  type!: EventType;

  @ApiProperty({
    example: '2026-02-01T00:00:00Z',
    description: 'Event start date (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({
    example: '2026-02-15T23:59:59Z',
    description: 'Event end date (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiProperty({
    example: 'TP. Hồ Chí Minh',
    description: 'Event location',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateEventDto {
  @ApiProperty({
    example: 'Sự kiện quyên góp lũ lụt 2026 - Updated',
    description: 'Event title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'Updated description...',
    description: 'Event description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '2026-02-05T00:00:00Z',
    description: 'Event start date (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({
    example: '2026-02-20T23:59:59Z',
    description: 'Event end date (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiProperty({
    example: 'TP. Hồ Chí Minh, TP. Đà Nẵng',
    description: 'Event location',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateEventStatusDto {
  @ApiProperty({
    enum: EventStatus,
    example: EventStatus.OPEN,
    description: `Status: ${Object.values(EventStatus).join(', ')}`,
  })
  @IsEnum(EventStatus)
  status!: EventStatus;
}

export class ListEventsQueryDto {
  @ApiProperty({
    enum: EventType,
    example: EventType.DONATION,
    description: 'Filter by event type',
    required: false,
  })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiProperty({
    enum: EventStatus,
    example: EventStatus.OPEN,
    description: 'Filter by event status',
    required: false,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiProperty({
    example: 'lũ lụt',
    description: 'Search by title or location',
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

export class VolunteerRegistrationDto {
  @ApiProperty({
    example: 'Tôi có thể tham gia từ ngày 5-10/2',
    description: 'Volunteer note',
    required: false,
  })
  @IsOptional()
  note?: string;
}
