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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common';
import { AccountRole } from '@/database/entities';
import { TeamsService } from '@/teams/services';
import {
  CreateTeamDto,
  UpdateTeamDto,
  ListTeamsQueryDto,
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
  async createTeam(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.createTeam(createTeamDto);
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
