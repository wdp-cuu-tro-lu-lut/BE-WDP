import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@/common';
import { AccountRole } from '@/database/entities';
import {
  CreateTeamRegistrationRequestDto,
  ReviewTeamRegistrationRequestDto,
} from '@/teams/dto';
import { TeamsService } from '@/teams/services';

@Controller('team-registration-requests')
@ApiTags('Team Registration Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamRegistrationRequestsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Roles(AccountRole.USER)
  @ApiOperation({ summary: 'Submit a request to create a rescue team' })
  @ApiBody({
    type: CreateTeamRegistrationRequestDto,
    examples: {
      default: {
        summary: 'User submits a team registration request',
        value: {
          name: 'Đội cứu hộ dân sự Bình Thạnh',
          area: 'Bình Thạnh, Phú Nhuận, Gò Vấp, TP.HCM',
          teamSize: 8,
          baseLocation: 'Kho tập kết Bình Thạnh, TP.HCM',
          latitude: 10.8035,
          longitude: 106.7097,
          description: 'Nhóm tình nguyện địa phương có kinh nghiệm cứu hộ trong mùa mưa lũ.',
          specialties: ['first_aid', 'water_rescue'],
          equipmentList: [
            {
              equipmentName: 'Bộ sơ cứu',
              quantity: 8,
              status: 'ready',
            },
          ],
          vehicles: [
            {
              vehicleTypeCode: 'xe_ban_tai',
              plateNumber: '51C-45678',
              capacity: 5,
              status: 'ready',
            },
          ],
        },
      },
    },
  })
  async createRequest(
    @CurrentUser() user: any,
    @Body() createDto: CreateTeamRegistrationRequestDto,
  ) {
    return this.teamsService.createTeamRegistrationRequest(user.id, createDto);
  }

  @Get('mine')
  @Roles(AccountRole.USER)
  @ApiOperation({ summary: 'List my team registration requests' })
  async listMyRequests(@CurrentUser() user: any) {
    return this.teamsService.listMyTeamRegistrationRequests(user.id);
  }

  @Get('admin')
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'List all team registration requests for review' })
  async listRequestsForAdmin() {
    return this.teamsService.listTeamRegistrationRequests();
  }

  @Get('admin/:id')
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'Get team registration request by ID' })
  async getRequestForAdmin(@Param('id') id: string) {
    return this.teamsService.getTeamRegistrationRequest(id);
  }

  @Patch('admin/:id/review')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a team registration request' })
  @ApiBody({
    type: ReviewTeamRegistrationRequestDto,
    examples: {
      approve: {
        summary: 'Approve and create the team',
        value: {
          status: 'approved',
          reviewNote: 'Đủ hồ sơ và phù hợp khu vực đang thiếu đội hỗ trợ.',
        },
      },
      reject: {
        summary: 'Reject the request',
        value: {
          status: 'rejected',
          reviewNote: 'Thông tin nhân sự và phương tiện chưa đầy đủ.',
        },
      },
    },
  })
  async reviewRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() reviewDto: ReviewTeamRegistrationRequestDto,
  ) {
    return this.teamsService.reviewTeamRegistrationRequest(id, user.id, reviewDto);
  }
}