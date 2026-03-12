import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common';
import { AccountRole } from '@/database/entities';
import { TeamsService } from '@/teams/services';
import {
  CreateTeamMemberDto,
  CreateTeamDto,
  UpdateTeamDto,
  UpdateTeamMemberDto,
  ListTeamsQueryDto,
  VehicleTypeResponseDto,
} from '@/teams/dto';

@Controller('admin/teams')
@ApiTags('Admin / Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Create team' })
  @ApiBody({
    type: CreateTeamDto,
    examples: {
      default: {
        summary: 'Create team with details',
        value: {
          name: 'Alpha Rescue Team',
          area: 'Quận 1, Quận 3, TP.HCM',
          teamSize: 12,
          baseLocation: 'Kho vận Quận 1, TP.HCM',
          latitude: 10.7769,
          longitude: 106.7009,
          rating: 4.8,
          specialties: ['first_aid', 'trauma_care', 'water_rescue'],
          equipmentList: [
            {
              equipmentName: 'Bộ sơ cứu',
              quantity: 12,
              status: 'ready',
            },
            {
              equipmentName: 'Dây cứu hộ',
              quantity: 6,
              status: 'in_use',
            },
          ],
          vehicles: [
            {
              vehicleTypeCode: 'xe_cuu_thuong',
              plateNumber: '51A-12345',
              capacity: 4,
              status: 'ready',
            },
            {
              vehicleTypeCode: 'xe_ban_tai',
              plateNumber: '51C-67890',
              capacity: 6,
              status: 'maintenance',
            },
          ],
          accountEmail: 'alpha.team@example.com',
          accountPassword: 'Team@123',
          accountFullName: 'Alpha Rescue Team',
        },
      },
    },
  })
  async createTeam(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.createTeam(createTeamDto);
  }

  @Get('vehicle-types')
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'List vehicle types' })
  async listVehicleTypes() {
    return this.teamsService.listVehicleTypes();
  }

  @Get(':id/members')
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'List members of a team' })
  async listTeamMembers(@Param('id') id: string) {
    return this.teamsService.listTeamMembers(id);
  }

  @Post(':id/members')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Add a new member to a team' })
  @ApiBody({
    type: CreateTeamMemberDto,
    examples: {
      default: {
        summary: 'Create and add a new team member',
        value: {
          email: 'alpha.member1@example.com',
          password: 'Member@123',
          fullName: 'Nguyen Van B',
          phone: '0909123456',
          address: '45 Le Loi, Quan 1, TP.HCM',
          role: 'member',
          status: 'active',
          isActive: true,
        },
      },
    },
  })
  async addTeamMember(
    @Param('id') id: string,
    @Body() createTeamMemberDto: CreateTeamMemberDto,
  ) {
    return this.teamsService.addTeamMember(id, createTeamMemberDto);
  }

  @Patch(':id/members/:memberId')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Update a team member' })
  @ApiBody({
    type: UpdateTeamMemberDto,
    examples: {
      default: {
        summary: 'Promote or update a team member',
        value: {
          fullName: 'Nguyen Van B Updated',
          phone: '0909345678',
          address: '120 Nguyen Hue, Quan 1, TP.HCM',
          role: 'member',
          status: 'active',
          isActive: true,
        },
      },
      promoteLeader: {
        summary: 'Promote a member to team leader',
        value: {
          role: 'team_leader',
          status: 'active',
          isActive: true,
        },
      },
    },
  })
  async updateTeamMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateTeamMemberDto: UpdateTeamMemberDto,
  ) {
    return this.teamsService.updateTeamMember(id, memberId, updateTeamMemberDto);
  }

  @Delete(':id/members/:memberId')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Remove a team member' })
  async removeTeamMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.removeTeamMember(id, memberId);
  }

  @Get(':id')
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'Get team by ID' })
  async getTeam(@Param('id') id: string) {
    return this.teamsService.getTeam(id);
  }

  @Get()
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'List all teams' })
  async listTeams(@Query() query: ListTeamsQueryDto) {
    return this.teamsService.listTeams(query);
  }

  @Patch(':id')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Update team' })
  @ApiBody({
    type: UpdateTeamDto,
    examples: {
      default: {
        summary: 'Update team details',
        value: {
          name: 'Alpha Rescue Team - Updated',
          area: 'Quận 1, Quận 3, Bình Thạnh, TP.HCM',
          teamSize: 14,
          baseLocation: 'Kho trung tâm Bình Thạnh, TP.HCM',
          latitude: 10.8102,
          longitude: 106.7099,
          rating: 4.9,
          specialties: ['first_aid', 'trauma_care'],
          equipmentList: [
            {
              equipmentName: 'Bộ sơ cứu nâng cao',
              quantity: 15,
              status: 'ready',
            },
          ],
          vehicles: [
            {
              vehicleTypeCode: 'xe_cuu_thuong',
              plateNumber: '51A-12345',
              capacity: 4,
              status: 'ready',
            },
          ],
          isActive: true,
        },
      },
    },
  })
  async updateTeam(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(id, updateTeamDto);
  }

  @Delete(':id')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Delete team' })
  async deleteTeam(@Param('id') id: string) {
    return this.teamsService.deleteTeam(id);
  }
}
