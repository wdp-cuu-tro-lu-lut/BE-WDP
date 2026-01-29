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
import { DonationsService } from '@/donations/services';
import {
  CreateDonationDto,
  ApproveDonationDto,
  RejectDonationDto,
  ListDonationsQueryDto,
} from '@/donations/dto';

@Controller('events/:eventId/donations')
@ApiTags('Donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.USER)
  @ApiOperation({ summary: 'Create donation (USER)' })
  async createDonation(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateDonationDto,
  ) {
    return this.donationsService.createDonation(eventId, user.id, createDto);
  }

  @Get(':donationId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get donation by ID' })
  async getDonation(@Param('donationId') id: string) {
    return this.donationsService.getDonation(id);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my donations (USER)' })
  async getMyDonations(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.donationsService.listMyDonations(user.id, page, limit);
  }
}

@Controller('admin/donations')
@ApiTags('Admin / Donations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN, AccountRole.STAFF)
export class AdminDonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Get()
  @ApiOperation({ summary: 'List donations (ADMIN/STAFF)' })
  async listDonations(@Query() query: ListDonationsQueryDto) {
    return this.donationsService.listDonations(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get donation (ADMIN/STAFF)' })
  async getDonation(@Param('id') id: string) {
    return this.donationsService.getDonation(id);
  }

  @Patch(':id/approve')
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'Approve donation' })
  async approveDonation(
    @Param('id') id: string,
    @Body() approveDto: ApproveDonationDto,
  ) {
    return this.donationsService.approveDonation(id, approveDto);
  }

  @Patch(':id/reject')
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'Reject donation' })
  async rejectDonation(
    @Param('id') id: string,
    @Body() rejectDto: RejectDonationDto,
  ) {
    return this.donationsService.rejectDonation(id, rejectDto);
  }
}
