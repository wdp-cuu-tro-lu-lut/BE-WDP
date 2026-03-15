import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@/common';
import { AccountRole } from '@/database/entities';
import { WarehouseService } from '@/warehouse/services';
import {
  CreateReceiptDto,
  CreateManualStockEntryDto,
  CreateAllocationDto,
  UpdateAllocationStatusDto,
  ListAllocationsQueryDto,
  CreateRescueSupplyOrderDto,
  ListRescueSupplyOrdersQueryDto,
  CreateRescueReplenishmentRequestDto,
  ReviewReplenishmentRequestDto,
  CompleteRescueSupplyOrderDto,
  ListWarehouseTransactionsQueryDto,
} from '@/warehouse/dto';

@Controller('warehouse')
@ApiTags('Warehouse')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN, AccountRole.STAFF)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get('stocks')
  @ApiOperation({ summary: 'List warehouse stocks' })
  async listStocks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.warehouseService.listStocks(page, limit);
  }

  @Post('stocks/manual')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Admin nhập tay tồn kho' })
  async createManualStockEntry(
    @CurrentUser() user: any,
    @Body() createDto: CreateManualStockEntryDto,
  ) {
    return this.warehouseService.createManualStockEntry(user.id, createDto);
  }

  @Post('receipts')
  @ApiOperation({ summary: 'Create warehouse receipt (from approved donation)' })
  async createReceipt(@CurrentUser() user: any, @Body() createDto: CreateReceiptDto) {
    return this.warehouseService.createReceipt(user.id, createDto);
  }

  @Get('receipts')
  @ApiOperation({ summary: 'List warehouse receipts' })
  async listReceipts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.warehouseService.listReceipts(page, limit);
  }

  @Get('receipts/:id')
  @ApiOperation({ summary: 'Get receipt' })
  async getReceipt(@Param('id') id: string) {
    return this.warehouseService.getReceipt(id);
  }

  @Post('allocations')
  @ApiOperation({ summary: 'Create allocation (with pessimistic lock)' })
  async createAllocation(
    @CurrentUser() user: any,
    @Body() createDto: CreateAllocationDto,
  ) {
    return this.warehouseService.createAllocation(user.id, createDto);
  }

  @Post('rescue-orders')
  @ApiOperation({ summary: 'Tạo phiếu vật phẩm cho rescue request' })
  async createRescueSupplyOrder(
    @CurrentUser() user: any,
    @Body() createDto: CreateRescueSupplyOrderDto,
  ) {
    return this.warehouseService.createRescueSupplyOrder(user.id, createDto);
  }

  @Get('rescue-orders')
  @ApiOperation({ summary: 'Danh sách phiếu vật phẩm cứu trợ' })
  async listRescueSupplyOrders(@Query() query: ListRescueSupplyOrdersQueryDto) {
    return this.warehouseService.listRescueSupplyOrders(query);
  }

  @Get('rescue-orders/:id')
  @ApiOperation({ summary: 'Chi tiết phiếu vật phẩm cứu trợ' })
  async getRescueSupplyOrder(@Param('id') id: string) {
    return this.warehouseService.getRescueSupplyOrder(id);
  }

  @Post('rescue-orders/:id/check-stock')
  @ApiOperation({ summary: 'Kiểm tra kho cho phiếu vật phẩm' })
  async checkRescueSupplyOrderStock(@Param('id') id: string) {
    return this.warehouseService.checkRescueSupplyOrderStock(id);
  }

  @Post('rescue-orders/:id/dispatch')
  @ApiOperation({ summary: 'Xuất vật phẩm cho đội cứu trợ' })
  async dispatchRescueSupplyOrder(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.warehouseService.dispatchRescueSupplyOrder(id, user.id);
  }

  @Post('rescue-orders/:id/replenishment-requests')
  @ApiOperation({ summary: 'Staff gửi yêu cầu admin bổ sung hàng cho phiếu' })
  async createReplenishmentRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() createDto: CreateRescueReplenishmentRequestDto,
  ) {
    return this.warehouseService.createReplenishmentRequest(id, user.id, createDto);
  }

  @Patch('replenishment-requests/:id/review')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Admin duyệt hoặc từ chối yêu cầu bổ sung hàng' })
  async reviewReplenishmentRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() reviewDto: ReviewReplenishmentRequestDto,
  ) {
    return this.warehouseService.reviewReplenishmentRequest(id, user.id, reviewDto);
  }

  @Post('rescue-orders/:id/complete')
  @ApiOperation({ summary: 'Chốt phiếu cứu trợ và hoàn kho vật phẩm còn dư' })
  async completeRescueSupplyOrder(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() completeDto: CompleteRescueSupplyOrderDto,
  ) {
    return this.warehouseService.completeRescueSupplyOrder(id, user.id, completeDto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Sổ giao dịch nhập xuất kho' })
  async listTransactions(@Query() query: ListWarehouseTransactionsQueryDto) {
    return this.warehouseService.listTransactions(query);
  }

  @Get('allocations')
  @ApiOperation({ summary: 'List allocations' })
  async listAllocations(@Query() query: ListAllocationsQueryDto) {
    return this.warehouseService.listAllocations(query);
  }

  @Get('allocations/:id')
  @ApiOperation({ summary: 'Get allocation' })
  async getAllocation(@Param('id') id: string) {
    return this.warehouseService.getAllocation(id);
  }

  @Patch('allocations/:id/status')
  @ApiOperation({ summary: 'Update allocation status' })
  async updateAllocationStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateAllocationStatusDto,
  ) {
    return this.warehouseService.updateAllocationStatus(id, updateDto);
  }
}
