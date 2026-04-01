import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@/common';
import { AccountRole } from '@/database/entities';
import {
  CreateTeamMemberDto,
  ListMyTeamAllocationsQueryDto,
  UpdateTeamDto,
  UpdateTeamMemberDto,
} from '@/teams/dto';
import { TeamsService } from '@/teams/services';

@Controller('team')
@ApiTags('Team Self Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.RESCUE_TEAM)
export class TeamSelfController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my team detail' })
  async getMyTeam(@CurrentUser() user: any) {
    return this.teamsService.getMyTeam(user.id);
  }

  @Get('vehicle-types')
  @ApiOperation({ summary: 'List vehicle types for team management' })
  async listVehicleTypes() {
    return this.teamsService.listVehicleTypes();
  }

  @Get('members')
  @ApiOperation({ summary: 'List members of my team' })
  async listMyTeamMembers(@CurrentUser() user: any) {
    return this.teamsService.listMyTeamMembers(user.id);
  }

  @Get('allocations')
  @ApiOperation({ summary: 'List allocations assigned to my team' })
  async listMyTeamAllocations(
    @CurrentUser() user: any,
    @Query() query: ListMyTeamAllocationsQueryDto,
  ) {
    return this.teamsService.listMyTeamAllocations(user.id, query);
  }

  @Get('allocations/:allocationId')
  @ApiOperation({ summary: 'Get allocation detail assigned to my team' })
  async getMyTeamAllocation(
    @CurrentUser() user: any,
    @Param('allocationId') allocationId: string,
  ) {
    return this.teamsService.getMyTeamAllocation(user.id, allocationId);
  }

  @Get('warehouse/summary')
  @ApiOperation({ summary: 'Get my team warehouse stock summary (delivered allocations + received handoffs net returns)' })
  async getMyTeamWarehouseSummary(@CurrentUser() user: any) {
    return this.teamsService.getMyTeamWarehouseSummary(user.id);
  }

  @Post('allocations/:allocationId/receive')
  @ApiOperation({ summary: 'Confirm my team has received allocated items' })
  async receiveMyTeamAllocation(
    @CurrentUser() user: any,
    @Param('allocationId') allocationId: string,
  ) {
    return this.teamsService.receiveMyTeamAllocation(user.id, allocationId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my team (team leader only)' })
  @ApiBody({ type: UpdateTeamDto })
  async updateMyTeam(
    @CurrentUser() user: any,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.updateMyTeam(user.id, updateTeamDto);
  }

  @Post('members')
  @ApiOperation({ summary: 'Add a new member to my team (team leader only)' })
  @ApiBody({ type: CreateTeamMemberDto })
  async addMyTeamMember(
    @CurrentUser() user: any,
    @Body() createTeamMemberDto: CreateTeamMemberDto,
  ) {
    return this.teamsService.addMyTeamMember(user.id, createTeamMemberDto);
  }

  @Patch('members/:memberId')
  @ApiOperation({ summary: 'Update a member of my team (team leader only)' })
  @ApiBody({ type: UpdateTeamMemberDto })
  async updateMyTeamMember(
    @CurrentUser() user: any,
    @Param('memberId') memberId: string,
    @Body() updateTeamMemberDto: UpdateTeamMemberDto,
  ) {
    return this.teamsService.updateMyTeamMember(user.id, memberId, updateTeamMemberDto);
  }

  @Delete('members/:memberId')
  @ApiOperation({ summary: 'Remove a member from my team (team leader only)' })
  async removeMyTeamMember(
    @CurrentUser() user: any,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.removeMyTeamMember(user.id, memberId);
  }

  @Delete('disband')
  @ApiOperation({ summary: 'Disband my team (team leader only)' })
  async disbandMyTeam(@CurrentUser() user: any) {
    return this.teamsService.disbandMyTeam(user.id);
  }
}