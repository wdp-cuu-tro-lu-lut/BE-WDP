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
@Roles(AccountRole.ADMIN)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create team' })
  async createTeam(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.createTeam(createTeamDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  async getTeam(@Param('id') id: string) {
    return this.teamsService.getTeam(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all teams' })
  async listTeams(@Query() query: ListTeamsQueryDto) {
    return this.teamsService.listTeams(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team' })
  async updateTeam(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(id, updateTeamDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  async deleteTeam(@Param('id') id: string) {
    return this.teamsService.deleteTeam(id);
  }
}
