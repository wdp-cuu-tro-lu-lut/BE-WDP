import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles, RolesGuard, JwtAuthGuard } from '@/common';
import {
  RealtimeNotificationService,
  StaffRealtimePayload,
} from '@/common/services/realtime-notification.service';
import { AccountRole } from '@/database/entities';
import {
  AdminDashboardOverviewDto,
  StaffDashboardOverviewDto,
  TriggerStaffRealtimeNotificationDto,
} from '@/dashboard/dto';
import { DashboardService } from '@/dashboard/services';

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
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get staff dashboard stats' })
  @ApiOkResponse({ type: StaffDashboardOverviewDto })
  async getStats(): Promise<StaffDashboardOverviewDto> {
    return this.dashboardService.getStaffOverview();
  }
}