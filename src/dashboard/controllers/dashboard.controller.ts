import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles, RolesGuard, JwtAuthGuard } from '@/common';
import {
  RealtimeNotificationService,
  StaffRealtimePayload,
} from '@/common/services/realtime-notification.service';
import { AccountRole, StaffNotificationCategory } from '@/database/entities';
import {
  AdminDashboardOverviewDto,
  MarkStaffNotificationsReadDto,
  StaffDashboardOverviewDto,
  StaffNotificationUnreadSummaryDto,
  TriggerStaffRealtimeNotificationDto,
} from '@/dashboard/dto';
import { DashboardService, StaffNotificationService } from '@/dashboard/services';

@Controller('admin/dashboard')
@ApiTags('Admin / Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly realtimeNotificationService: RealtimeNotificationService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  @ApiOkResponse({ type: AdminDashboardOverviewDto })
  async getStats(): Promise<AdminDashboardOverviewDto> {
    return this.dashboardService.getOverview();
  }

  @Post('staff-notifications/test')
  @ApiOperation({ summary: 'Emit a test realtime notification for STAFF/ADMIN' })
  @ApiCreatedResponse({
    schema: {
      example: {
        delivered: true,
        event: 'staff.notification',
        payload: {
          type: 'RESCUE_REQUEST_CREATED',
          title: 'Test cảnh báo realtime',
          message: 'Đây là thông báo test từ backend.',
          severity: 'warning',
          createdAt: '2026-03-17T10:00:00.000Z',
          data: {
            requestId: 'test-request-id',
            priority: 'HIGH',
            address: 'Khu vực test',
            estimatedPeople: 12,
            status: 'NEW',
          },
        },
      },
    },
  })
  async emitTestStaffNotification(
    @Body() body: TriggerStaffRealtimeNotificationDto,
  ) {
    const payload: StaffRealtimePayload = {
      type: body.type,
      title: body.title,
      message: body.message,
      severity: body.severity,
      createdAt: new Date().toISOString(),
      data:
        body.data ??
        (body.type === 'PENDING_DONATION_CREATED'
          ? {
              donationId: 'test-donation-id',
              eventId: 'test-event-id',
              status: 'SUBMITTED',
              pendingProductsCount: body.pendingProductsCount ?? 1,
            }
          : body.type === 'VOLUNTEER_REGISTRATION_CREATED'
            ? {
                registrationId: 'test-registration-id',
                eventId: 'test-volunteer-event-id',
                accountId: 'test-account-id',
                pendingVolunteerRegistrations: 4,
              }
            : body.type === 'REPLENISHMENT_REQUEST_CREATED'
              ? {
                  requestId: 'test-replenishment-id',
                  orderId: 'test-order-id',
                  pendingReplenishmentRequests: 2,
                }
              : {
              requestId: 'test-request-id',
              priority: 'HIGH',
              address: 'Khu vực test realtime',
              estimatedPeople: 5,
              status: 'NEW',
              pendingRescueRequests: 3,
            }),
    };

    this.realtimeNotificationService.emitStaffNotification(payload);

    return {
      delivered: true,
      event: 'staff.notification',
      payload,
    };
  }

  @Get('staff-notifications/debug')
  @ApiOperation({
    summary: 'Get realtime socket connection stats for STAFF/ADMIN notifications',
  })
  async getStaffNotificationDebug() {
    return this.realtimeNotificationService.getConnectionStats();
  }
}

@Controller('staff/dashboard')
@ApiTags('Staff / Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN, AccountRole.STAFF)
export class StaffDashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly staffNotificationService: StaffNotificationService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get staff dashboard stats' })
  @ApiOkResponse({ type: StaffDashboardOverviewDto })
  async getStats(): Promise<StaffDashboardOverviewDto> {
    return this.dashboardService.getStaffOverview();
  }

  @Get('notifications/unread-summary')
  @ApiOperation({ summary: 'Get unread realtime notification summary for the current staff/admin account' })
  @ApiOkResponse({ type: StaffNotificationUnreadSummaryDto })
  async getUnreadNotificationSummary(
    @CurrentUser() user: any,
  ): Promise<StaffNotificationUnreadSummaryDto> {
    return this.staffNotificationService.getUnreadSummary(user.id);
  }

  @Post('notifications/mark-read')
  @ApiOperation({ summary: 'Mark staff/admin realtime notifications as read by category' })
  @ApiOkResponse({
    schema: {
      example: {
        updatedCount: 2,
        readAt: '2026-03-24T09:00:00.000Z',
        unreadSummary: {
          totalUnread: 0,
          productsUnread: 0,
          rescueRequestsUnread: 0,
          replenishmentRequestsUnread: 0,
          teamRegistrationRequestsUnread: 0,
        },
      },
    },
  })
  async markNotificationsAsRead(
    @CurrentUser() user: any,
    @Body() body: MarkStaffNotificationsReadDto,
  ) {
    const result = await this.staffNotificationService.markCategoryAsRead(
      user.id,
      body.category,
    );
    const unreadSummary = await this.staffNotificationService.getUnreadSummary(
      user.id,
    );

    return {
      ...result,
      unreadSummary,
      category: body.category,
      isRescueCategory: body.category === StaffNotificationCategory.RESCUE_REQUESTS,
      isProductsCategory: body.category === StaffNotificationCategory.PRODUCTS,
      isReplenishmentCategory:
        body.category === StaffNotificationCategory.REPLENISHMENT_REQUESTS,
      isTeamRegistrationCategory:
        body.category === StaffNotificationCategory.TEAM_REGISTRATION_REQUESTS,
    };
  }
}