import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '@/common';
import { AccountRole } from '@/database/entities';
import { RescueService } from '@/rescue/services';
import { FilesService } from '@/files/services';
import {
  CreateRescueRequestDto,
  CreateGuestRescueRequestDto,
  ClaimRescueRequestDto,
  CreateTeamReviewDto,
  ReviewRescueRequestDto,
  CreateRescueAssignmentDto,
  ReplaceRescueAssignmentsDto,
  RespondAssignmentDto,
  ReportAssignmentIncidentDto,
  UpdateProgressDto,
  ListRescueRequestsQueryDto,
  ListAssignmentsQueryDto,
} from '@/rescue/dto';

@Controller('rescue-requests')
@ApiTags('Rescue')
export class RescueController {
  constructor(
    private readonly rescueService: RescueService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Guest (chưa đăng nhập) gửi yêu cầu cứu trợ khẩn cấp.
   * Không cần JWT — chỉ cần tên + SĐT + địa chỉ.
   */
  @Post('guest')
  @Public()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid image type'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Gửi yêu cầu cứu trợ KHÔNG cần đăng nhập (guest)',
    description:
      'Dành cho trường hợp khẩn cấp. Guest cung cấp tên, SĐT, và địa chỉ. Sau khi đăng nhập có thể claim lại request.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guestName: { type: 'string', example: 'Nguyễn Văn A' },
        guestPhone: { type: 'string', example: '0901234567' },
        address: { type: 'string', example: '123 Đường ABC, Quận 1, TP.HCM' },
        latitude: { type: 'number', example: 10.7769 },
        longitude: { type: 'number', example: 106.6966 },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          example: 'HIGH',
        },
        note: { type: 'string', example: 'Mực nước đang dâng cao' },
        estimatedPeople: { type: 'number', example: 5 },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['guestName', 'guestPhone', 'address'],
    },
  })
  async createGuestRequest(
    @Body() createDto: CreateGuestRescueRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const uploaded = files?.length
      ? await Promise.all(
          files.map((file) => this.filesService.uploadImage(file, 'wdp')),
        )
      : [];

    const mergedEvidenceImages = Array.from(
      new Set([
        ...(createDto.evidenceImages ?? []),
        ...uploaded.map((item) => item.url),
      ]),
    ).slice(0, 10);

    return this.rescueService.createGuestRequest({
      ...createDto,
      evidenceImages: mergedEvidenceImages,
    });
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.USER)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid image type'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Create rescue request (USER — đã đăng nhập)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string', example: '123 Đường ABC, Quận 1, TP.HCM' },
        latitude: { type: 'number', example: 10.7769 },
        longitude: { type: 'number', example: 106.6966 },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          example: 'HIGH',
        },
        note: { type: 'string', example: 'Mực nước đang dâng cao' },
        estimatedPeople: { type: 'number', example: 5 },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['address'],
    },
  })
  async createRequest(
    @CurrentUser() user: any,
    @Body() createDto: CreateRescueRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const uploaded = files?.length
      ? await Promise.all(
          files.map((file) => this.filesService.uploadImage(file, 'wdp')),
        )
      : [];

    const mergedEvidenceImages = Array.from(
      new Set([
        ...(createDto.evidenceImages ?? []),
        ...uploaded.map((item) => item.url),
      ]),
    ).slice(0, 10);

    return this.rescueService.createRequest(user.id, {
      ...createDto,
      evidenceImages: mergedEvidenceImages,
    });
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

  @Get(':id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.USER, AccountRole.ADMIN, AccountRole.STAFF)
  @ApiOperation({ summary: 'List team reviews for a rescue request' })
  async listTeamReviews(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.rescueService.listTeamReviews(id, user);
  }

  @Post(':id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.USER)
  @ApiOperation({
    summary: 'Create a team review after the rescue request is completed or fails',
  })
  @ApiBody({
    type: CreateTeamReviewDto,
    examples: {
      success: {
        summary: 'Rate the team after successful rescue',
        value: {
          teamId: 'b17fafda-f496-4226-9d86-7640b58e9208',
          rating: 5,
          comment: 'Đội đến nhanh và hỗ trợ rất tận tình.',
        },
      },
      failed: {
        summary: 'Rate the team after an unsuccessful rescue attempt',
        value: {
          teamId: 'b17fafda-f496-4226-9d86-7640b58e9208',
          rating: 2,
          comment: 'Đội có liên hệ nhưng không thể tiếp cận hiện trường kịp thời.',
        },
      },
    },
  })
  async createTeamReview(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() createTeamReviewDto: CreateTeamReviewDto,
  ) {
    return this.rescueService.createTeamReview(id, user.id, createTeamReviewDto);
  }

  @Patch(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel rescue request (USER owner)' })
  async cancelRequest(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rescueService.cancelRequest(id, user.id);
  }

  @Post(':id/evidence-images')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid image type'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload ảnh hiện trường cho rescue request' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['images'],
    },
  })
  async uploadEvidenceImages(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No images uploaded');
    }

    const uploaded = await Promise.all(
      files.map((file) => this.filesService.uploadImage(file, 'wdp')),
    );
    const imageUrls = uploaded.map((item) => item.url);

    return this.rescueService.addEvidenceImages(id, user, imageUrls);
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

  @Put('admin/:id/assignments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Replace assigned teams for request (ADMIN)' })
  async replaceAssignments(
    @Param('id') id: string,
    @Body() replaceDto: ReplaceRescueAssignmentsDto,
  ) {
    return this.rescueService.replaceAssignments(id, replaceDto);
  }
}

@Controller('team/assignments')
@ApiTags('Team / Rescue Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.RESCUE_TEAM)
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
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() respondDto: RespondAssignmentDto,
  ) {
    return this.rescueService.respondAssignment(user.id, id, respondDto);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update progress (RESCUE_TEAM)' })
  async updateProgress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateProgressDto,
  ) {
    return this.rescueService.updateProgress(user.id, id, updateDto);
  }

  @Patch(':id/report-incident')
  @ApiOperation({ summary: 'Report incident and cancel assignment (RESCUE_TEAM)' })
  async reportIncident(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() reportDto: ReportAssignmentIncidentDto,
  ) {
    return this.rescueService.reportAssignmentIncident(user.id, id, reportDto);
  }
}
