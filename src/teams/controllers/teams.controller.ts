import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common';
import { AccountRole } from '@/database/entities';
import { TeamsService } from '@/teams/services';
import {
  ListTeamsQueryDto,
} from '@/teams/dto';

@Controller('admin/teams')
@ApiTags('Admin / Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('vehicle-types')
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'List vehicle types' })
  async listVehicleTypes() {
    return this.teamsService.listVehicleTypes();
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

  @Delete(':id')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Delete team' })
  async deleteTeam(@Param('id') id: string) {
    return this.teamsService.deleteTeam(id);
  }
}
