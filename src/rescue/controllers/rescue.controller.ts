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
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '@/common';
import { AccountRole } from '@/database/entities';
import { RescueService } from '@/rescue/services';
import {
  CreateRescueRequestDto,
  CreateGuestRescueRequestDto,
  ClaimRescueRequestDto,
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

  /**
   * Guest (chưa đăng nhập) gửi yêu cầu cứu trợ khẩn cấp.
   * Không cần JWT — chỉ cần tên + SĐT + địa chỉ.
   */
  @Post('guest')
  @Public()
  @ApiOperation({
    summary: 'Gửi yêu cầu cứu trợ KHÔNG cần đăng nhập (guest)',
    description:
      'Dành cho trường hợp khẩn cấp. Guest cung cấp tên, SĐT, và địa chỉ. Sau khi đăng nhập có thể claim lại request.',
  })
  async createGuestRequest(@Body() createDto: CreateGuestRescueRequestDto) {
    return this.rescueService.createGuestRequest(createDto);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.USER)
  @ApiOperation({ summary: 'Create rescue request (USER — đã đăng nhập)' })
  async createRequest(
    @CurrentUser() user: any,
    @Body() createDto: CreateRescueRequestDto,
  ) {
    return this.rescueService.createRequest(user.id, createDto);
  }

  /**
   * User đã đăng nhập nhận lại (claim) các rescue request đã gửi khi chưa login.
   * Đối chiếu bằng guestPhone.
   */
  @Post('claim')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Claim guest rescue requests sau khi đăng nhập',
    description:
      'User đã đăng nhập cung cấp SĐT đã dùng lúc gửi guest request. Hệ thống sẽ gán creatorId cho các request đó.',
  })
  async claimGuestRequests(
    @CurrentUser() user: any,
    @Body() claimDto: ClaimRescueRequestDto,
  ) {
    return this.rescueService.claimGuestRequests(user.id, claimDto);
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
  @Roles(AccountRole.ADMIN, AccountRole.STAFF, AccountRole.RESCUE_TEAM)
  @ApiOperation({ summary: 'List rescue requests (ADMIN/STAFF/RESCUE_TEAM)' })
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
