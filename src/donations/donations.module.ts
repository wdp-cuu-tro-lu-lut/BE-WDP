import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation, DonationItem, Category } from '@/database/entities';
import { DonationsService } from '@/donations/services';
import {
  DonationsController,
  GlobalDonationsController,
  AdminDonationsController,
} from '@/donations/controllers';
import { CommonModule } from '@/common/common.module';
import { DashboardModule } from '@/dashboard/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, DonationItem, Category]),
    CommonModule,
    DashboardModule,
  ],
  providers: [DonationsService],
  controllers: [DonationsController, GlobalDonationsController, AdminDonationsController],
  exports: [DonationsService],
})
export class DonationsModule {}
