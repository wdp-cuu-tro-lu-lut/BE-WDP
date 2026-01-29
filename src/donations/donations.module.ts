import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation, DonationItem } from '@/database/entities';
import { DonationsService } from '@/donations/services';
import {
  DonationsController,
  AdminDonationsController,
} from '@/donations/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, DonationItem])],
  providers: [DonationsService],
  controllers: [DonationsController, AdminDonationsController],
  exports: [DonationsService],
})
export class DonationsModule {}
