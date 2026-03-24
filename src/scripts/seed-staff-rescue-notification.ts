import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import {
  AssignmentStatus,
  RescueAssignment,
  RescueRequest,
  Team,
} from '@/database/entities';
import { RealtimeNotificationService } from '@/common/services/realtime-notification.service';
import { StaffNotificationService } from '@/dashboard/services';
import { DataSource, Repository } from 'typeorm';

type NotificationSeedTarget = {
  assignmentId: string;
  teamId: string;
  teamName: string;
  requestId: string;
  requestStatus: string;
  address: string;
  respondedAt: Date;
};

async function seedStaffRescueNotification() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const dataSource = app.get(DataSource);
    const staffNotificationService = app.get(StaffNotificationService);
    const realtimeNotificationService = app.get(RealtimeNotificationService);

    const assignmentRepository = dataSource.getRepository(RescueAssignment);
    const teamRepository = dataSource.getRepository(Team);
    const rescueRequestRepository = dataSource.getRepository(RescueRequest);

    const countArg = process.argv.find((value) => value.startsWith('--count='));
    const requestedCount = Number.parseInt(countArg?.split('=')[1] ?? '1', 10);
    const count = Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : 1;

    const acceptedAssignments = await assignmentRepository.find({
      where: {
        status: AssignmentStatus.ACCEPTED,
      },
      relations: ['team', 'rescueRequest'],
      order: { respondedAt: 'DESC', updatedAt: 'DESC' },
      take: count,
    });

    const targets: NotificationSeedTarget[] = acceptedAssignments.length > 0
      ? acceptedAssignments
          .filter((assignment) => assignment.team && assignment.rescueRequest)
          .slice(0, count)
          .map((assignment) => ({
            assignmentId: assignment.id,
            teamId: assignment.teamId,
            teamName: assignment.team?.name ?? 'Đội cứu hộ',
            requestId: assignment.rescueRequestId,
            requestStatus: assignment.rescueRequest?.status ?? 'ACCEPTED',
            address: assignment.rescueRequest?.address ?? 'Khu vực cứu hộ',
            respondedAt: assignment.respondedAt ?? new Date(),
          }))
      : [];

    while (targets.length < count) {
      const fallbackTarget = await buildFallbackTarget(
        teamRepository,
        rescueRequestRepository,
      );

      targets.push({
        ...fallbackTarget,
        assignmentId: `${fallbackTarget.assignmentId}-${targets.length + 1}`,
        respondedAt: new Date(),
      });
    }

    const seeded = [];
    let realtimeSkipped = false;

    for (const target of targets) {
      const assignmentLike = {
        id: target.assignmentId,
        teamId: target.teamId,
        rescueRequestId: target.requestId,
        respondedAt: target.respondedAt,
        team: {
          id: target.teamId,
          name: target.teamName,
        },
        rescueRequest: {
          id: target.requestId,
          status: target.requestStatus,
          address: target.address,
        },
      } as RescueAssignment;

      const notifications =
        await staffNotificationService.createRescueAssignmentAcceptedNotifications(
          assignmentLike,
        );

      try {
        realtimeNotificationService.notifyRescueAssignmentAccepted(assignmentLike);
      } catch (error) {
        realtimeSkipped = true;
      }

      seeded.push({
        assignmentId: target.assignmentId,
        teamName: target.teamName,
        address: target.address,
        createdNotifications: notifications.length,
      });
    }

    console.log('Seeded staff rescue notifications successfully:');
    console.log(
      JSON.stringify(
        {
          requestedCount: count,
          actualCount: seeded.length,
          seeded,
          realtimeSkipped,
          note: realtimeSkipped
            ? 'Unread notifications were created successfully. Realtime emit was skipped because this standalone script does not host an active websocket server.'
            : 'Unread notifications were created for all STAFF and ADMIN accounts. If the app is open, realtime events were emitted too.',
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

async function buildFallbackTarget(
  teamRepository: Repository<Team>,
  rescueRequestRepository: Repository<RescueRequest>,
): Promise<NotificationSeedTarget> {
  const [[team], [rescueRequest]] = await Promise.all([
    teamRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    }),
    rescueRequestRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    }),
  ]);

  return {
    assignmentId: `seed-assignment-${Date.now()}`,
    teamId: team?.id ?? 'seed-team-id',
    teamName: team?.name ?? 'Đội cứu hộ test',
    requestId: rescueRequest?.id ?? 'seed-request-id',
    requestStatus: rescueRequest?.status ?? 'ACCEPTED',
    address: rescueRequest?.address ?? 'Điểm cứu hộ test',
    respondedAt: new Date(),
  };
}

seedStaffRescueNotification().catch((error) => {
  console.error(error);
  process.exit(1);
});