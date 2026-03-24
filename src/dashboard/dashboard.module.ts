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
  StaffNotification,
  VolunteerRegistration,
  WarehouseStock,
} from '@/database/entities';
import {
  DashboardController,
  StaffDashboardController,
} from '@/dashboard/controllers';
import { DashboardService, StaffNotificationService } from '@/dashboard/services';

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
      StaffNotification,
      VolunteerRegistration,
      WarehouseStock,
    ]),
  ],
  providers: [DashboardService, StaffNotificationService],
  controllers: [DashboardController, StaffDashboardController],
  exports: [DashboardService, StaffNotificationService],
})
export class DashboardModule {}