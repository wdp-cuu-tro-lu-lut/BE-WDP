import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation, DonationItem, Category } from '@/database/entities';
import { DonationsService } from '@/donations/services';
import {
  DonationsController,
  AdminDonationsController,
} from '@/donations/controllers';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, DonationItem, Category]), CommonModule],
  providers: [DonationsService],
  controllers: [DonationsController, AdminDonationsController],
  exports: [DonationsService],
})
export class DonationsModule {}
