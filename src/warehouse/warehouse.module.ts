import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WarehouseStock,
  WarehouseReceipt,
  WarehouseReceiptItem,
  Allocation,
  AllocationItem,
  Donation,
  DonationItem,
  Category,
  RescueRequest,
  RescueSupplyOrder,
  RescueSupplyOrderItem,
  ReplenishmentRequest,
  ReplenishmentRequestItem,
  WarehouseTransaction,
} from '@/database/entities';
import { WarehouseService } from '@/warehouse/services';
import { WarehouseController } from '@/warehouse/controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseStock,
      WarehouseReceipt,
      WarehouseReceiptItem,
      Allocation,
      AllocationItem,
      Donation,
      DonationItem,
      Category,
      RescueRequest,
      RescueSupplyOrder,
      RescueSupplyOrderItem,
      ReplenishmentRequest,
      ReplenishmentRequestItem,
      WarehouseTransaction,
    ]),
  ],
  providers: [WarehouseService],
  controllers: [WarehouseController],
  exports: [WarehouseService],
})
export class WarehouseModule {}
