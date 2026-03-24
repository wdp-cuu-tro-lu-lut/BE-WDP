import { Injectable } from '@nestjs/common';
import {
  Donation,
  RescuePriority,
  RescueAssignment,
  RescueRequest,
  ReplenishmentRequest,
  TeamRegistrationRequest,
  VolunteerRegistration,
} from '@/database/entities';
import { RealtimeGateway } from '@/common/gateways';

type StaffRealtimeEventType =
  | 'PENDING_DONATION_CREATED'
  | 'VOLUNTEER_REGISTRATION_CREATED'
  | 'RESCUE_REQUEST_CREATED'
  | 'REPLENISHMENT_REQUEST_CREATED'
  | 'RESCUE_ASSIGNMENT_ACCEPTED'
  | 'TEAM_REGISTRATION_REQUEST_CREATED';

type StaffSidebarMetricsPayload = {
  pendingProducts?: number;
  pendingVolunteerRegistrations?: number;
  pendingRescueRequests?: number;
  pendingReplenishmentRequests?: number;
  totalStockItems?: number;
  updatedAt?: string;
};

export type StaffRealtimePayload = {
  type: StaffRealtimeEventType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  data: Record<string, unknown>;
};

@Injectable()
export class RealtimeNotificationService {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  getConnectionStats() {
    return this.realtimeGateway.getConnectionStats();
  }

  emitStaffMetricsUpdate(payload: StaffSidebarMetricsPayload) {
    this.realtimeGateway.emitToStaffAndAdmin('staff.dashboard.updated', {
      ...payload,
      updatedAt: payload.updatedAt ?? new Date().toISOString(),
    });
  }

  emitStaffNotification(payload: StaffRealtimePayload) {
    this.realtimeGateway.emitToStaffAndAdmin('staff.notification', payload);

    const metricsUpdate: StaffSidebarMetricsPayload = {
      updatedAt: payload.createdAt,
    };

    if (
      payload.type === 'PENDING_DONATION_CREATED' &&
      typeof payload.data.pendingProductsCount === 'number'
    ) {
      metricsUpdate.pendingProducts = payload.data.pendingProductsCount;
    }

    if (
      payload.type === 'VOLUNTEER_REGISTRATION_CREATED' &&
      typeof payload.data.pendingVolunteerRegistrations === 'number'
    ) {
      metricsUpdate.pendingVolunteerRegistrations =
        payload.data.pendingVolunteerRegistrations;
    }

    if (
      payload.type === 'RESCUE_REQUEST_CREATED' &&
      typeof payload.data.pendingRescueRequests === 'number'
    ) {
      metricsUpdate.pendingRescueRequests = payload.data.pendingRescueRequests;
    }

    if (
      payload.type === 'REPLENISHMENT_REQUEST_CREATED' &&
      typeof payload.data.pendingReplenishmentRequests === 'number'
    ) {
      metricsUpdate.pendingReplenishmentRequests =
        payload.data.pendingReplenishmentRequests;
    }

    if (Object.keys(metricsUpdate).length > 1) {
      this.emitStaffMetricsUpdate(metricsUpdate);
    }
  }

  emitAdminNotification(payload: StaffRealtimePayload) {
    this.realtimeGateway.emitToAdmin('staff.notification', payload);
  }

  notifyPendingDonationCreated(
    donation: Donation,
    pendingProductsCount: number,
  ) {
    const payload: StaffRealtimePayload = {
      type: 'PENDING_DONATION_CREATED',
      title: 'Có sản phẩm chờ duyệt mới',
      message: `Đơn quyên góp ${donation.id} vừa được gửi và đang chờ staff xác minh.`,
      severity: 'info',
      createdAt: new Date().toISOString(),
      data: {
        donationId: donation.id,
        eventId: donation.eventId,
        status: donation.status,
        pendingProductsCount,
      },
    };

    this.emitStaffNotification(payload);
  }

  notifyUrgentRescueRequestCreated(rescueRequest: RescueRequest) {
    const severity =
      rescueRequest.priority === RescuePriority.CRITICAL
        ? 'critical'
        : rescueRequest.priority === RescuePriority.HIGH
          ? 'warning'
          : 'info';

    const payload: StaffRealtimePayload = {
      type: 'RESCUE_REQUEST_CREATED',
      title:
        rescueRequest.priority === RescuePriority.CRITICAL
          ? 'Có yêu cầu cứu hộ khẩn cấp'
          : rescueRequest.priority === RescuePriority.HIGH
            ? 'Có yêu cầu cứu hộ mức cao'
            : 'Có đơn cứu hộ mới',
      message: `Yêu cầu tại ${rescueRequest.address} có mức độ ${rescueRequest.priority}.`,
      severity,
      createdAt: new Date().toISOString(),
      data: {
        requestId: rescueRequest.id,
        priority: rescueRequest.priority,
        address: rescueRequest.address,
        estimatedPeople: rescueRequest.estimatedPeople,
        status: rescueRequest.status,
      },
    };

    this.emitStaffNotification(payload);
  }

  notifyVolunteerRegistrationCreated(
    registration: VolunteerRegistration,
    pendingVolunteerRegistrations: number,
    eventTitle?: string | null,
  ) {
    const payload: StaffRealtimePayload = {
      type: 'VOLUNTEER_REGISTRATION_CREATED',
      title: 'Có đăng ký tình nguyện viên mới',
      message: eventTitle
        ? `Có tình nguyện viên mới đăng ký vào sự kiện ${eventTitle}.`
        : 'Có tình nguyện viên mới đăng ký tham gia sự kiện.',
      severity: 'info',
      createdAt: new Date().toISOString(),
      data: {
        registrationId: registration.id,
        eventId: registration.eventId,
        accountId: registration.accountId,
        pendingVolunteerRegistrations,
      },
    };

    this.emitStaffNotification(payload);
  }

  notifyReplenishmentRequestCreated(
    request: ReplenishmentRequest,
    pendingReplenishmentRequests: number,
  ) {
    const payload: StaffRealtimePayload = {
      type: 'REPLENISHMENT_REQUEST_CREATED',
      title: 'Có yêu cầu bổ sung hàng mới',
      message: `Phiếu ${request.orderId} vừa tạo yêu cầu bổ sung hàng và đang chờ duyệt.`,
      severity: 'warning',
      createdAt: new Date().toISOString(),
      data: {
        requestId: request.id,
        orderId: request.orderId,
        pendingReplenishmentRequests,
      },
    };

    this.emitStaffNotification(payload);
  }

  notifyRescueAssignmentAccepted(assignment: RescueAssignment) {
    const payload: StaffRealtimePayload = {
      type: 'RESCUE_ASSIGNMENT_ACCEPTED',
      title: 'Có đội cứu hộ đã nhận nhiệm vụ',
      message: `${assignment.team?.name ?? 'Một đội cứu hộ'} đã nhận đơn tại ${assignment.rescueRequest?.address ?? 'khu vực cứu hộ'}.`,
      severity: 'info',
      createdAt: new Date().toISOString(),
      data: {
        assignmentId: assignment.id,
        requestId: assignment.rescueRequestId,
        requestStatus: assignment.rescueRequest?.status,
        address: assignment.rescueRequest?.address,
        teamId: assignment.teamId,
        teamName: assignment.team?.name ?? null,
        respondedAt: assignment.respondedAt?.toISOString() ?? null,
      },
    };

    this.emitStaffNotification(payload);
  }

  notifyTeamRegistrationRequestCreated(request: TeamRegistrationRequest) {
    const payload: StaffRealtimePayload = {
      type: 'TEAM_REGISTRATION_REQUEST_CREATED',
      title: 'Có yêu cầu đăng ký đội cứu hộ mới',
      message: `${request.name} vừa gửi yêu cầu đăng ký đội cứu hộ và đang chờ duyệt.`,
      severity: 'info',
      createdAt: new Date().toISOString(),
      data: {
        requestId: request.id,
        requestedById: request.requestedById,
        teamName: request.name,
        area: request.area,
        status: request.status,
        teamSize: request.teamSize,
      },
    };

    this.emitAdminNotification(payload);
  }
}