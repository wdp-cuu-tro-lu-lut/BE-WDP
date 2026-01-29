import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { AccountRole } from '@/database/entities';
import { DonationsService } from '@/donations/services';
import { RejectDonationDto, ApproveDonationDto } from '@/donations/dto';

@ApiTags('Admin Donations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/donations')
export class AdminDonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Patch(':id/reject')
  async rejectDonation(
    @Param('id') donationId: string,
    @Body() rejectDto: RejectDonationDto,
  ) {
    return this.donationsService.rejectDonation(donationId, rejectDto);
  }

  @Patch(':id/approve')
  async approveDonation(
    @Param('id') donationId: string,
    @Body() approveDto: ApproveDonationDto,
  ) {
    return this.donationsService.approveDonation(donationId, approveDto);
  }
}
