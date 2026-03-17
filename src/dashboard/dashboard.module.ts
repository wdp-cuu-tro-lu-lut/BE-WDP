import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '@/common/common.module';
import {
  Account,
  Donation,
  DonationItem,
  Event,
  ReplenishmentRequest,
  RescueRequest,
  VolunteerRegistration,
  WarehouseStock,
} from '@/database/entities';
import {
  DashboardController,
  StaffDashboardController,
} from '@/dashboard/controllers';
import { DashboardService } from '@/dashboard/services';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      Account,
      Donation,
      DonationItem,
      Event,
      ReplenishmentRequest,
      RescueRequest,
      VolunteerRegistration,
      WarehouseStock,
    ]),
  ],
  providers: [DashboardService],
  controllers: [DashboardController, StaffDashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}