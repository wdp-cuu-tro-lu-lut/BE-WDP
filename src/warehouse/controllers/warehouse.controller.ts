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
  CreateAllocationDto,
  UpdateAllocationStatusDto,
  ListAllocationsQueryDto,
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
