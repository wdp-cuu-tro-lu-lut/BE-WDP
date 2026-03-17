import { ApiProperty } from '@nestjs/swagger';

export class WarehouseStatsDto {
  @ApiProperty({ example: 1250, description: 'Tổng số lượng vật phẩm hiện có trong kho' })
  totalItems!: number;

  @ApiProperty({ example: 12, description: 'Số danh mục vật phẩm đang có trong kho' })
  totalCategories!: number;

  @ApiProperty({ example: 0, description: 'Tổng giá trị ước tính. Hiện chưa có dữ liệu định giá nên trả về 0.' })
  totalValue!: number;

  @ApiProperty({ example: 6, description: 'Số phiếu nhập từ donation trong tháng hiện tại' })
  recentDonations!: number;

  @ApiProperty({ example: 180, description: 'Tổng số lượng vật phẩm đã xuất trong tháng hiện tại' })
  distributedThisMonth!: number;
}