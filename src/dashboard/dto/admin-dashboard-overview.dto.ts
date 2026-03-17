import { ApiProperty } from '@nestjs/swagger';

export class PendingRequestBreakdownDto {
  @ApiProperty({ example: 4, description: 'Số rescue request đang ở trạng thái NEW' })
  rescue!: number;

  @ApiProperty({ example: 2, description: 'Số replenishment request đang chờ duyệt' })
  replenishment!: number;
}

export class AdminDashboardOverviewDto {
  @ApiProperty({ example: 3, description: 'Số sự kiện đang mở' })
  openEvents!: number;

  @ApiProperty({ example: 6, description: 'Tổng số yêu cầu đang chờ xử lý' })
  pendingRequests!: number;

  @ApiProperty({ type: PendingRequestBreakdownDto })
  pendingRequestBreakdown!: PendingRequestBreakdownDto;

  @ApiProperty({ example: 1250, description: 'Tổng số lượng tồn kho hiện tại' })
  totalStock!: number;

  @ApiProperty({ example: 42, description: 'Tổng số tài khoản chưa bị xoá mềm' })
  totalAccounts!: number;

  @ApiProperty({ example: 39, description: 'Số tài khoản đang active' })
  activeAccounts!: number;
}