import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  Account,
  AccountRole,
  Donation,
  ReplenishmentRequest,
  RescueAssignment,
  StaffNotification,
  StaffNotificationCategory,
  StaffNotificationSeverity,
  StaffNotificationType,
  TeamRegistrationRequest,
} from '@/database/entities';
import { StaffNotificationUnreadSummaryDto } from '@/dashboard/dto';

type CreateStaffNotificationInput = {
  roles?: AccountRole[];
  type: StaffNotificationType;
  category: StaffNotificationCategory;
  title: string;
  message: string;
  severity: StaffNotificationSeverity;
  data?: Record<string, unknown>;
};

@Injectable()
export class StaffNotificationService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(StaffNotification)
    private readonly staffNotificationRepository: Repository<StaffNotification>,
  ) {}

  async createForRoles(input: CreateStaffNotificationInput) {
    const roles = input.roles ?? [AccountRole.STAFF, AccountRole.ADMIN];

    const recipients = await this.accountRepository.find({
      select: ['id'],
      where: {
        role: In(roles),
        isActive: true,
      },
    });

    if (recipients.length === 0) {
      return [];
    }

    const notifications = recipients.map((recipient) =>
      this.staffNotificationRepository.create({
        recipientAccountId: recipient.id,
        type: input.type,
        category: input.category,
        title: input.title,
        message: input.message,
        severity: input.severity,
        data: input.data ?? null,
        readAt: null,
      }),
    );

    return this.staffNotificationRepository.save(notifications);
  }

  async createRescueAssignmentAcceptedNotifications(assignment: RescueAssignment) {
    return this.createForRoles({
      type: StaffNotificationType.RESCUE_ASSIGNMENT_ACCEPTED,
      category: StaffNotificationCategory.RESCUE_REQUESTS,
      title: 'Có đội cứu hộ đã nhận nhiệm vụ',
      message: `${assignment.team?.name ?? 'Một đội cứu hộ'} đã nhận đơn tại ${assignment.rescueRequest?.address ?? 'khu vực cứu hộ'}.`,
      severity: StaffNotificationSeverity.INFO,
      data: {
        assignmentId: assignment.id,
        requestId: assignment.rescueRequest?.id,
        requestStatus: assignment.rescueRequest?.status,
        address: assignment.rescueRequest?.address,
        teamId: assignment.teamId,
        teamName: assignment.team?.name ?? null,
        respondedAt: assignment.respondedAt?.toISOString() ?? null,
      },
    });
  }

  async createPendingDonationCreatedNotifications(
    donation: Donation,
    pendingProductsCount: number,
  ) {
    return this.createForRoles({
      type: StaffNotificationType.PENDING_DONATION_CREATED,
      category: StaffNotificationCategory.PRODUCTS,
      title: 'Có sản phẩm chờ duyệt mới',
      message: `Đơn quyên góp ${donation.id} vừa được gửi và đang chờ staff xác minh.`,
      severity: StaffNotificationSeverity.INFO,
      data: {
        donationId: donation.id,
        eventId: donation.eventId,
        status: donation.status,
        pendingProductsCount,
      },
    });
  }

  async createTeamRegistrationRequestCreatedNotifications(
    request: TeamRegistrationRequest,
  ) {
    return this.createForRoles({
      roles: [AccountRole.ADMIN],
      type: StaffNotificationType.TEAM_REGISTRATION_REQUEST_CREATED,
      category: StaffNotificationCategory.TEAM_REGISTRATION_REQUESTS,
      title: 'Có yêu cầu đăng ký đội cứu hộ mới',
      message: `${request.name} vừa gửi yêu cầu đăng ký đội cứu hộ và đang chờ duyệt.`,
      severity: StaffNotificationSeverity.INFO,
      data: {
        requestId: request.id,
        requestedById: request.requestedById,
        teamName: request.name,
        area: request.area,
        status: request.status,
        teamSize: request.teamSize,
      },
    });
  }

  async createReplenishmentRequestCreatedNotifications(
    request: ReplenishmentRequest,
    pendingReplenishmentRequests: number,
  ) {
    return this.createForRoles({
      roles: [AccountRole.ADMIN],
      type: StaffNotificationType.REPLENISHMENT_REQUEST_CREATED,
      category: StaffNotificationCategory.REPLENISHMENT_REQUESTS,
      title: 'Có yêu cầu bổ sung hàng mới',
      message: `Phiếu ${request.orderId} vừa tạo yêu cầu bổ sung hàng và đang chờ duyệt.`,
      severity: StaffNotificationSeverity.WARNING,
      data: {
        requestId: request.id,
        orderId: request.orderId,
        pendingReplenishmentRequests,
        status: request.status,
      },
    });
  }

  async getUnreadSummary(accountId: string): Promise<StaffNotificationUnreadSummaryDto> {
    const [
      totalUnread,
      productsUnread,
      rescueRequestsUnread,
      replenishmentRequestsUnread,
      teamRegistrationRequestsUnread,
    ] = await Promise.all([
      this.staffNotificationRepository.count({
        where: {
          recipientAccountId: accountId,
          readAt: IsNull(),
        },
      }),
      this.staffNotificationRepository.count({
        where: {
          recipientAccountId: accountId,
          category: StaffNotificationCategory.PRODUCTS,
          readAt: IsNull(),
        },
      }),
      this.staffNotificationRepository.count({
        where: {
          recipientAccountId: accountId,
          category: StaffNotificationCategory.RESCUE_REQUESTS,
          readAt: IsNull(),
        },
      }),
      this.staffNotificationRepository.count({
        where: {
          recipientAccountId: accountId,
          category: StaffNotificationCategory.REPLENISHMENT_REQUESTS,
          readAt: IsNull(),
        },
      }),
      this.staffNotificationRepository.count({
        where: {
          recipientAccountId: accountId,
          category: StaffNotificationCategory.TEAM_REGISTRATION_REQUESTS,
          readAt: IsNull(),
        },
      }),
    ]);

    return {
      totalUnread,
      productsUnread,
      rescueRequestsUnread,
      replenishmentRequestsUnread,
      teamRegistrationRequestsUnread,
    };
  }

  async markCategoryAsRead(accountId: string, category: StaffNotificationCategory) {
    const readAt = new Date();

    const result = await this.staffNotificationRepository.update(
      {
        recipientAccountId: accountId,
        category,
        readAt: IsNull(),
      },
      {
        readAt,
      },
    );

    return {
      updatedCount: result.affected ?? 0,
      readAt: readAt.toISOString(),
    };
  }
}