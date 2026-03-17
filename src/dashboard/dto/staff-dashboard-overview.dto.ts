import { ApiProperty } from '@nestjs/swagger';

export class StaffDashboardOverviewDto {
  @ApiProperty({ example: 8, description: 'Số sản phẩm đang chờ xác minh' })
  pendingProducts!: number;

  @ApiProperty({ example: 14, description: 'Số đăng ký tình nguyện viên hiện có ở các sự kiện đang mở' })
  pendingVolunteerRegistrations!: number;

  @ApiProperty({ example: 3, description: 'Số đơn cứu hộ mới đang chờ xử lý' })
  pendingRescueRequests!: number;

  @ApiProperty({ example: 2, description: 'Số yêu cầu bổ sung hàng đang chờ duyệt' })
  pendingReplenishmentRequests!: number;

  @ApiProperty({ example: 1250, description: 'Tổng số lượng mặt hàng hiện có trong kho' })
  totalStockItems!: number;
}