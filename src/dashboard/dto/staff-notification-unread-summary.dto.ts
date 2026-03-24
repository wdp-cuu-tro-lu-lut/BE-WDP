import { ApiProperty } from '@nestjs/swagger';

export class StaffNotificationUnreadSummaryDto {
  @ApiProperty({ example: 2 })
  totalUnread!: number;

  @ApiProperty({ example: 1 })
  productsUnread!: number;

  @ApiProperty({ example: 2 })
  rescueRequestsUnread!: number;

  @ApiProperty({ example: 1 })
  replenishmentRequestsUnread!: number;

  @ApiProperty({ example: 1 })
  teamRegistrationRequestsUnread!: number;
}