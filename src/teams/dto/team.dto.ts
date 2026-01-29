import { IsOptional, IsInt, IsBoolean, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
  @IsInt()
  teamSize!: number;
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
  @IsInt()
  teamSize?: number;

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
