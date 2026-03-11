import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RescueRequest,
  RescueAssignment,
  RescueStatus,
  AssignmentStatus,
  Team,
  AccountRole,
} from '@/database/entities';
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
import {
  ResourceNotFoundException,
  ForbiddenException,
  ConflictException,
} from '@/common/exceptions';
import {
  RescueStatusTransition,
  AssignmentStatusTransition,
} from '@/rescue/helpers';

@Injectable()
export class RescueService {
  constructor(
    @InjectRepository(RescueRequest)
    private rescueRepository: Repository<RescueRequest>,
    @InjectRepository(RescueAssignment)
    private assignmentRepository: Repository<RescueAssignment>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
  ) {}

  async createRequest(creatorId: string, createDto: CreateRescueRequestDto) {
    const rescue = this.rescueRepository.create({
      creatorId,
      ...createDto,
      evidenceImages: createDto.evidenceImages ?? [],
    });
    return this.rescueRepository.save(rescue);
  }

  /**
   * Tạo rescue request cho guest (chưa đăng nhập).
   * creatorId = null, lưu thông tin liên lạc guestName + guestPhone.
   */
  async createGuestRequest(createDto: CreateGuestRescueRequestDto) {
    const rescue = this.rescueRepository.create({
      creatorId: null,
      guestName: createDto.guestName,
      guestPhone: createDto.guestPhone,
      address: createDto.address,
      latitude: createDto.latitude,
      longitude: createDto.longitude,
      priority: createDto.priority,
      note: createDto.note,
      estimatedPeople: createDto.estimatedPeople,
      evidenceImages: createDto.evidenceImages ?? [],
    });
    return this.rescueRepository.save(rescue);
  }

  async addEvidenceImages(
    requestId: string,
    actor: { id: string; role?: AccountRole },
    imageUrls: string[],
  ) {
    const rescue = await this.getRequest(requestId);

    const canManageAnyRequest =
      actor.role === AccountRole.ADMIN || actor.role === AccountRole.STAFF;

    if (!canManageAnyRequest && rescue.creatorId !== actor.id) {
      throw new ForbiddenException(
        'You are not allowed to upload evidence images for this request',
      );
    }

    const existingImages = rescue.evidenceImages ?? [];
    const merged = Array.from(new Set([...existingImages, ...imageUrls]));

    // Hard cap để tránh payload quá lớn trong 1 request.
    rescue.evidenceImages = merged.slice(0, 10);

    return this.rescueRepository.save(rescue);
  }

  /**
   * User đã đăng nhập "nhận lại" các rescue request mà họ đã gửi khi chưa login.
   * Đối chiếu qua guestPhone. Gán creatorId = userId.
   */
  async claimGuestRequests(userId: string, claimDto: ClaimRescueRequestDto) {
    const unclaimed = await this.rescueRepository.find({
      where: {
        creatorId: null as any,
        guestPhone: claimDto.guestPhone,
      },
    });

    if (unclaimed.length === 0) {
      throw new ResourceNotFoundException(
        'Rescue request',
        `guestPhone=${claimDto.guestPhone}`,
      );
    }

    for (const req of unclaimed) {
      req.creatorId = userId;
    }

    return this.rescueRepository.save(unclaimed);
  }

  async getRequest(id: string) {
    const rescue = await this.rescueRepository.findOne({
      where: { id },
      relations: ['assignments', 'assignments.team'],
    });
    if (!rescue) {
      throw new ResourceNotFoundException('Rescue request', id);
    }
    return rescue;
  }

  async listMyRequests(creatorId: string, page = 1, limit = 20) {
    const qb = this.rescueRepository
      .createQueryBuilder('rescue')
      .leftJoinAndSelect('rescue.assignments', 'assignments')
      .where('rescue.creatorId = :creatorId', { creatorId });

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const requests = await qb.skip(skip).take(limit).getMany();

    return {
      data: requests,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async listRequests(query: ListRescueRequestsQueryDto) {
    const {
      status,
      priority,
      assigned,
      q,
      from,
      to,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'DESC',
    } = query;

    let qb = this.rescueRepository
      .createQueryBuilder('rescue')
      .leftJoinAndSelect('rescue.creator', 'creator')
      .leftJoinAndSelect('creator.profile', 'profile')
      .leftJoinAndSelect('rescue.assignments', 'assignments')
      .leftJoinAndSelect('assignments.team', 'team');

    if (status) {
      qb = qb.where('rescue.status = :status', { status });
    }
    if (priority) {
      qb = qb.andWhere('rescue.priority = :priority', { priority });
    }
    if (q) {
      qb = qb.andWhere('rescue.address LIKE :q', { q: `%${q}%` });
    }
    if (assigned === 'true') {
      qb = qb.andWhere('assignments.id IS NOT NULL');
    } else if (assigned === 'false') {
      qb = qb.andWhere('assignments.id IS NULL');
    }
    if (from) {
      qb = qb.andWhere('rescue.createdAt >= :from', {
        from: new Date(from),
      });
    }
    if (to) {
      qb = qb.andWhere('rescue.createdAt <= :to', { to: new Date(to) });
    }

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const requests = await qb
      .orderBy(`rescue.${sortBy}`, order)
      .skip(skip)
      .take(limit)
      .getMany();

    // Fill guestName/guestPhone từ creator nếu chưa có (request cũ)
    // Thêm thông tin phân công đội cứu trợ
    const data = requests.map((r) => {
      const filledGuestName =
        r.guestName ?? r.creator?.profile?.fullName ?? null;
      const filledGuestPhone =
        r.guestPhone ?? r.creator?.phone ?? null;

      // Tóm tắt thông tin phân công
      const assignedTeams =
        r.assignments && r.assignments.length > 0
          ? r.assignments.map((a) => ({
              assignmentId: a.id,
              teamId: a.teamId,
              teamName: a.team?.name ?? null,
              area: a.team?.area ?? null,
              teamSize: a.team?.teamSize ?? 0,
              status: a.status,
              respondedAt: a.respondedAt,
            }))
          : [];

      // Bỏ creator và assignments gốc ra khỏi response
      const { creator, assignments, ...rest } = r as any;

      const acceptedCount = assignedTeams.filter(
        (t: any) => t.status === AssignmentStatus.ACCEPTED,
      ).length;

      return {
        ...rest,
        guestName: filledGuestName,
        guestPhone: filledGuestPhone,
        assignedTeams,
        isAssigned: assignedTeams.length > 0,
        teamSummary: {
          required: r.requiredTeams ?? 1,
          assigned: assignedTeams.length,
          accepted: acceptedCount,
          isFulfilled: acceptedCount >= (r.requiredTeams ?? 1),
        },
      };
    });

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async reviewRequest(id: string, reviewDto: ReviewRescueRequestDto) {
    const rescue = await this.getRequest(id);

    if (!RescueStatusTransition.isValidTransition(rescue.status, reviewDto.status)) {
      throw new ConflictException(
        `Cannot transition from ${rescue.status} to ${reviewDto.status}`,
      );
    }

    rescue.status = reviewDto.status;
    if (reviewDto.priority !== undefined) rescue.priority = reviewDto.priority;
    if (reviewDto.requiredTeams !== undefined) rescue.requiredTeams = reviewDto.requiredTeams;
    if (reviewDto.note !== undefined) rescue.note = reviewDto.note;

    return this.rescueRepository.save(rescue);
  }

  async assignTeams(id: string, createDto: CreateRescueAssignmentDto) {
    const rescue = await this.getRequest(id);

    // Cho phép assign khi REVIEWED hoặc ASSIGNED (để bổ sung team)
    if (
      rescue.status !== RescueStatus.REVIEWED &&
      rescue.status !== RescueStatus.ASSIGNED
    ) {
      throw new ConflictException(
        'Can only assign teams to REVIEWED or ASSIGNED requests',
      );
    }

    // Lọc bỏ team đã được assign rồi (tránh duplicate)
    const existingTeamIds = (rescue.assignments ?? []).map((a) => a.teamId);
    const newTeamIds = createDto.teamIds.filter(
      (tid) => !existingTeamIds.includes(tid),
    );

    if (newTeamIds.length === 0) {
      throw new ConflictException(
        'All specified teams are already assigned to this request',
      );
    }

    // Create assignments
    const assignments = newTeamIds.map((teamId) =>
      this.assignmentRepository.create({
        rescueRequestId: id,
        teamId,
      }),
    );

    await this.assignmentRepository.save(assignments);

    // Update request status nếu chưa phải ASSIGNED
    if (rescue.status !== RescueStatus.ASSIGNED) {
      await this.rescueRepository.update(id, {
        status: RescueStatus.ASSIGNED,
      });
    }

    return this.getRequest(id);
  }

  async getTeamAssignments(accountId: string, query: ListAssignmentsQueryDto) {
    const team = await this.teamRepository.findOne({ where: { accountId } });
    if (!team) {
      return { data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } };
    }

    const { status, page = 1, limit = 20 } = query;

    let qb = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.rescueRequest', 'rescue')
      .where('assignment.teamId = :teamId', { teamId: team.id });

    if (status) {
      qb = qb.andWhere('assignment.status = :status', { status });
    }

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const assignments = await qb.skip(skip).take(limit).getMany();

    return {
      data: assignments,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async respondAssignment(
    accountId: string,
    assignmentId: string,
    respondDto: RespondAssignmentDto,
  ) {
    const assignment = await this.getAssignmentForTeamAccount(accountId, assignmentId, [
      'team',
      'rescueRequest',
      'rescueRequest.assignments',
    ]);

    if (assignment.status !== AssignmentStatus.SENT) {
      throw new ConflictException('Can only respond to SENT assignments');
    }

    assignment.status = respondDto.status;
    assignment.respondedAt = new Date();

    if (respondDto.status === AssignmentStatus.ACCEPTED) {
      const request = assignment.rescueRequest;
      const requiredTeams = request.requiredTeams ?? 1;

      // Đếm số team đã ACCEPTED (bao gồm cả assignment hiện tại)
      const acceptedCount =
        request.assignments.filter((a) => a.status === AssignmentStatus.ACCEPTED).length + 1;

      if (acceptedCount >= requiredTeams) {
        // Đủ team rồi — cancel các assignment còn chờ
        const pendingAssignments = request.assignments.filter(
          (a) =>
            a.id !== assignmentId && a.status === AssignmentStatus.SENT,
        );

        for (const other of pendingAssignments) {
          other.status = AssignmentStatus.CANCELED;
        }

        await this.assignmentRepository.save(pendingAssignments);

        // Update rescue status → ACCEPTED
        request.status = RescueStatus.ACCEPTED;
        await this.rescueRepository.save(request);
      }
      // Chưa đủ team — giữ nguyên status ASSIGNED, chờ thêm team accept
    }

    return this.assignmentRepository.save(assignment);
  }

  async updateProgress(
    accountId: string,
    assignmentId: string,
    updateDto: UpdateProgressDto,
  ) {
    const assignment = await this.getAssignmentForTeamAccount(accountId, assignmentId, [
      'team',
      'rescueRequest',
    ]);

    if (assignment.status !== AssignmentStatus.ACCEPTED) {
      throw new ConflictException('Can only update progress on accepted assignments');
    }

    const request = assignment.rescueRequest;
    const canStartWork =
      updateDto.status === RescueStatus.IN_PROGRESS &&
      [RescueStatus.ASSIGNED, RescueStatus.ACCEPTED].includes(request.status);
    const isSameInProgressUpdate =
      request.status === RescueStatus.IN_PROGRESS &&
      updateDto.status === RescueStatus.IN_PROGRESS;

    if (
      !canStartWork &&
      !isSameInProgressUpdate &&
      !RescueStatusTransition.isValidTransition(request.status, updateDto.status)
    ) {
      throw new ConflictException(
        `Cannot transition to ${updateDto.status}`,
      );
    }

    request.status = updateDto.status;
    if (updateDto.progressNote) {
      assignment.progressNote = updateDto.progressNote;
    }

    await this.rescueRepository.save(request);
    return this.assignmentRepository.save(assignment);
  }

  private async getAssignmentForTeamAccount(
    accountId: string,
    assignmentId: string,
    relations: string[],
  ) {
    const team = await this.teamRepository.findOne({ where: { accountId } });

    if (!team) {
      throw new ForbiddenException('This account is not linked to any rescue team');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, teamId: team.id },
      relations,
    });

    if (!assignment) {
      throw new ResourceNotFoundException('Assignment', assignmentId);
    }

    return assignment;
  }

  async cancelRequest(id: string, creatorId: string) {
    const rescue = await this.getRequest(id);

    if (rescue.creatorId !== creatorId) {
      throw new ForbiddenException('Can only cancel own requests');
    }

    if (!RescueStatusTransition.canUserCancel(rescue.status)) {
      throw new ConflictException(
        `Cannot cancel request in ${rescue.status} status`,
      );
    }

    rescue.status = RescueStatus.CANCELED;
    return this.rescueRepository.save(rescue);
  }
}
