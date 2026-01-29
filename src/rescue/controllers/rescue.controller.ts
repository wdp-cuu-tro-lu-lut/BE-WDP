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
import { RescueService } from '@/rescue/services';
import {
  CreateRescueRequestDto,
  ReviewRescueRequestDto,
  CreateRescueAssignmentDto,
  RespondAssignmentDto,
  UpdateProgressDto,
  ListRescueRequestsQueryDto,
  ListAssignmentsQueryDto,
} from '@/rescue/dto';

@Controller('rescue-requests')
@ApiTags('Rescue')
export class RescueController {
  constructor(private readonly rescueService: RescueService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.USER)
  @ApiOperation({ summary: 'Create rescue request (USER)' })
  async createRequest(
    @CurrentUser() user: any,
    @Body() createDto: CreateRescueRequestDto,
  ) {
    return this.rescueService.createRequest(user.id, createDto);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my rescue requests (USER)' })
  async getMyRequests(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.rescueService.listMyRequests(user.id, page, limit);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get rescue request by ID' })
  async getRequest(@Param('id') id: string) {
    return this.rescueService.getRequest(id);
  }

  @Patch(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel rescue request (USER owner)' })
  async cancelRequest(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rescueService.cancelRequest(id, user.id);
  }

  // ADMIN endpoints
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'List rescue requests (ADMIN/STAFF)' })
  async listRequests(@Query() query: ListRescueRequestsQueryDto) {
    return this.rescueService.listRequests(query);
  }

  @Patch('admin/:id/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Review rescue request (ADMIN)' })
  async reviewRequest(
    @Param('id') id: string,
    @Body() reviewDto: ReviewRescueRequestDto,
  ) {
    return this.rescueService.reviewRequest(id, reviewDto);
  }

  @Post('admin/:id/assignments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Assign teams to request (ADMIN)' })
  async assignTeams(
    @Param('id') id: string,
    @Body() createDto: CreateRescueAssignmentDto,
  ) {
    return this.rescueService.assignTeams(id, createDto);
  }
}

@Controller('team/assignments')
@ApiTags('Team / Rescue Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TeamAssignmentController {
  constructor(private readonly rescueService: RescueService) {}

  @Get()
  @ApiOperation({ summary: 'Get my team assignments' })
  async getMyAssignments(
    @CurrentUser() user: any,
    @Query() query: ListAssignmentsQueryDto,
  ) {
    // Assume user has teamId in their profile - simplified for demo
    // In production, fetch team by RESCUE_TEAM user
    return this.rescueService.getTeamAssignments(user.id, query);
  }

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Respond to assignment (RESCUE_TEAM)' })
  async respondAssignment(
    @Param('id') id: string,
    @Body() respondDto: RespondAssignmentDto,
  ) {
    return this.rescueService.respondAssignment(id, respondDto);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update progress (RESCUE_TEAM)' })
  async updateProgress(
    @Param('id') id: string,
    @Body() updateDto: UpdateProgressDto,
  ) {
    return this.rescueService.updateProgress(id, updateDto);
  }
}
