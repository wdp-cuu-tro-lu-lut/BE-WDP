import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Account,
  RescueRequest,
  RescueAssignment,
  RescuePriority,
  RescueStatus,
  AssignmentStatus,
  RescueSupplyOrder,
  RescueSupplyOrderStatus,
  Team,
  TeamMember,
  TeamReview,
  TeamReviewOutcome,
  AccountRole,
} from '@/database/entities';
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
import {
  ResourceNotFoundException,
  ForbiddenException,
  ConflictException,
} from '@/common/exceptions';
import {
  RescueStatusTransition,
  AssignmentStatusTransition,
} from '@/rescue/helpers';
import { WarehouseService } from '@/warehouse/services';
import { RealtimeNotificationService } from '@/common/services/realtime-notification.service';

@Injectable()
export class RescueService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(RescueRequest)
    private rescueRepository: Repository<RescueRequest>,
    @InjectRepository(RescueAssignment)
    private assignmentRepository: Repository<RescueAssignment>,
    @InjectRepository(RescueSupplyOrder)
    private rescueSupplyOrderRepository: Repository<RescueSupplyOrder>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(TeamReview)
    private teamReviewRepository: Repository<TeamReview>,
    private warehouseService: WarehouseService,
    private realtimeNotificationService: RealtimeNotificationService,
  ) {}

  async createRequest(creatorId: string, createDto: CreateRescueRequestDto) {
    const rescue = this.rescueRepository.create({
      creatorId,
      ...createDto,
      evidenceImages: createDto.evidenceImages ?? [],
    });
    const savedRescue = await this.rescueRepository.save(rescue);
    await this.notifyStaffAboutPendingRescue(savedRescue);
    return savedRescue;
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
    const savedRescue = await this.rescueRepository.save(rescue);
    await this.notifyStaffAboutPendingRescue(savedRescue);
    return savedRescue;
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

  async getRequestDetail(id: string) {
    const rescue = await this.getRequest(id);
    return this.serializeRescueRequest(rescue);
  }

  async listTeamReviews(
    requestId: string,
    actor: { id: string; role?: AccountRole },
  ) {
    const rescue = await this.rescueRepository.findOne({
      where: { id: requestId },
      relations: ['assignments', 'assignments.team'],
    });

    if (!rescue) {
      throw new ResourceNotFoundException('Rescue request', requestId);
    }

    const canManageAnyRequest =
      actor.role === AccountRole.ADMIN || actor.role === AccountRole.STAFF;

    if (!canManageAnyRequest && rescue.creatorId !== actor.id) {
      throw new ForbiddenException('You are not allowed to view reviews for this request');
    }

    const reviews = await this.teamReviewRepository.find({
      where: { rescueRequestId: requestId },
      relations: ['team', 'reviewer', 'reviewer.profile'],
      order: { createdAt: 'DESC' },
    });

    return reviews.map((review) => this.serializeTeamReview(review));
  }

  async createTeamReview(
    requestId: string,
    reviewerId: string,
    createTeamReviewDto: CreateTeamReviewDto,
  ) {
    const rescue = await this.rescueRepository.findOne({
      where: { id: requestId },
      relations: ['assignments', 'assignments.team'],
    });

    if (!rescue) {
      throw new ResourceNotFoundException('Rescue request', requestId);
    }

    if (rescue.creatorId !== reviewerId) {
      throw new ForbiddenException('You can only review your own rescue request');
    }

    if (![RescueStatus.DONE, RescueStatus.CANCELED].includes(rescue.status)) {
      throw new ConflictException(
        'Team can only be reviewed after the rescue request is completed or fails',
      );
    }

    const acceptedAssignment = (rescue.assignments ?? []).find(
      (assignment) =>
        assignment.teamId === createTeamReviewDto.teamId &&
        assignment.status === AssignmentStatus.ACCEPTED,
    );

    if (!acceptedAssignment) {
      throw new ConflictException(
        'This team did not accept the specified rescue request',
      );
    }

    const existingReview = await this.teamReviewRepository.findOne({
      where: {
        rescueRequestId: requestId,
        teamId: createTeamReviewDto.teamId,
        reviewerId,
      },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this team for this rescue request');
    }

    const review = this.teamReviewRepository.create({
      rescueRequestId: requestId,
      teamId: createTeamReviewDto.teamId,
      reviewerId,
      rating: createTeamReviewDto.rating,
      outcome:
        rescue.status === RescueStatus.DONE
          ? TeamReviewOutcome.SUCCESS
          : TeamReviewOutcome.FAILED,
      comment: createTeamReviewDto.comment?.trim() || null,
    });

    const savedReview = await this.teamReviewRepository.save(review);
    await this.refreshTeamRating(createTeamReviewDto.teamId);

    const hydratedReview = await this.teamReviewRepository.findOne({
      where: { id: savedReview.id },
      relations: ['team', 'reviewer', 'reviewer.profile'],
    });

    if (!hydratedReview) {
      throw new ResourceNotFoundException('Team review', savedReview.id);
    }

    return this.serializeTeamReview(hydratedReview);
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
    const data = requests.map((request) => {
      const serialized = this.serializeRescueRequest(request) as any;
      const { creator, assignments, ...rest } = serialized;
      return rest;
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

    const savedRescue = await this.rescueRepository.save(rescue);
    const pendingRescueRequests = await this.rescueRepository.count({
      where: { status: RescueStatus.NEW },
    });

    this.realtimeNotificationService.emitStaffMetricsUpdate({
      pendingRescueRequests,
    });

    if (savedRescue.status === RescueStatus.NEW) {
      await this.notifyStaffAboutPendingRescue(savedRescue);
    }
    return savedRescue;
  }

  private async notifyStaffAboutPendingRescue(rescue: RescueRequest) {
    const pendingRescueRequests = await this.rescueRepository.count({
      where: { status: RescueStatus.NEW },
    });

    this.realtimeNotificationService.notifyUrgentRescueRequestCreated({
      ...rescue,
    } as RescueRequest);

    this.realtimeNotificationService.emitStaffMetricsUpdate({
      pendingRescueRequests,
    });
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

    return this.getRequestDetail(id);
  }

  async replaceAssignments(id: string, replaceDto: ReplaceRescueAssignmentsDto) {
    const rescue = await this.getRequest(id);

    if (
      rescue.status !== RescueStatus.REVIEWED &&
      rescue.status !== RescueStatus.ASSIGNED &&
      rescue.status !== RescueStatus.ACCEPTED
    ) {
      throw new ConflictException(
        'Can only replace teams for REVIEWED, ASSIGNED, or ACCEPTED requests',
      );
    }

    const hasDispatchedSupplyOrder =
      (await this.rescueSupplyOrderRepository.count({
        where: {
          rescueRequestId: id,
          status: RescueSupplyOrderStatus.DISPATCHED,
        },
      })) > 0;

    const desiredTeamIds = [...new Set(replaceDto.teamIds)];
    const currentAssignments = rescue.assignments ?? [];
    const acceptedAssignments = currentAssignments.filter(
      (assignment) => assignment.status === AssignmentStatus.ACCEPTED,
    );

    const removedAcceptedAssignments = acceptedAssignments.filter(
      (assignment) => !desiredTeamIds.includes(assignment.teamId),
    );

    if (removedAcceptedAssignments.length > 0 && hasDispatchedSupplyOrder) {
      throw new ConflictException(
        'Cannot replace accepted teams after rescue supplies were dispatched. Use the incident flow first.',
      );
    }

    await this.rescueRepository.manager.transaction(async (manager) => {
      const assignmentRepository = manager.getRepository(RescueAssignment);
      const rescueRepository = manager.getRepository(RescueRequest);
      const assignmentsToSave: RescueAssignment[] = [];

      for (const assignment of currentAssignments) {
        const shouldRemainAssigned = desiredTeamIds.includes(assignment.teamId);

        if (shouldRemainAssigned) {
          if (
            assignment.status === AssignmentStatus.CANCELED ||
            assignment.status === AssignmentStatus.DECLINED
          ) {
            assignment.status = AssignmentStatus.SENT;
            assignment.respondedAt = null as any;
            assignment.progressNote = null as any;
            assignment.incidentNote = null;
            assignment.incidentReportedAt = null;
            assignmentsToSave.push(assignment);
          }

          continue;
        }

        if (
          assignment.status === AssignmentStatus.SENT ||
          assignment.status === AssignmentStatus.ACCEPTED
        ) {
          assignment.status = AssignmentStatus.CANCELED;
          assignmentsToSave.push(assignment);
        }
      }

      const existingTeamIds = currentAssignments.map((assignment) => assignment.teamId);
      const newTeamIds = desiredTeamIds.filter(
        (teamId) => !existingTeamIds.includes(teamId),
      );

      const newAssignments = newTeamIds.map((teamId) =>
        assignmentRepository.create({
          rescueRequestId: id,
          teamId,
        }),
      );

      if (assignmentsToSave.length > 0) {
        await assignmentRepository.save(assignmentsToSave);
      }

      if (newAssignments.length > 0) {
        await assignmentRepository.save(newAssignments);
      }

      await rescueRepository.update(id, {
        status: this.resolveRescueStatusFromAssignments(
          [...currentAssignments, ...newAssignments],
          rescue.requiredTeams ?? 1,
        ),
      });
    });

    return this.getRequestDetail(id);
  }

  async getTeamAssignments(accountId: string, query: ListAssignmentsQueryDto) {
    const team = await this.resolveTeamForAccount(accountId);
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

  async getAssignmentSupplies(accountId: string, assignmentId: string) {
    await this.getAssignmentForTeamAccount(accountId, assignmentId, ['team', 'rescueRequest']);
    return this.warehouseService.listAssignmentSupplyHandoffs(assignmentId);
  }

  async receiveAssignmentSupply(
    accountId: string,
    assignmentId: string,
    handoffId: string,
  ) {
    await this.getAssignmentForTeamAccount(accountId, assignmentId, ['team', 'rescueRequest']);
    return this.warehouseService.receiveTeamHandoff(assignmentId, handoffId, accountId);
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

    if (canStartWork) {
      const hasReceivedSupplies =
        await this.warehouseService.hasReceivedAssignmentSupplies(assignment.id);

      if (!hasReceivedSupplies) {
        throw new ConflictException(
          'Team cannot start rescue before receiving assigned supplies',
        );
      }
    }

    request.status = updateDto.status;
    if (updateDto.progressNote) {
      assignment.progressNote = updateDto.progressNote;
    }

    await this.rescueRepository.save(request);
    return this.assignmentRepository.save(assignment);
  }

  async reportAssignmentIncident(
    accountId: string,
    assignmentId: string,
    reportDto: ReportAssignmentIncidentDto,
  ) {
    const team = await this.resolveTeamForAccount(accountId);

    if (!team) {
      throw new ForbiddenException('This account is not linked to any rescue team');
    }

    const incidentNote = reportDto.incidentNote.trim();

    return this.rescueRepository.manager.transaction(async (manager) => {
      const assignmentRepository = manager.getRepository(RescueAssignment);
      const rescueRepository = manager.getRepository(RescueRequest);

      const assignment = await assignmentRepository.findOne({
        where: { id: assignmentId, teamId: team.id },
        relations: ['team', 'rescueRequest', 'rescueRequest.assignments'],
      });

      if (!assignment) {
        throw new ResourceNotFoundException('Assignment', assignmentId);
      }

      if (assignment.status !== AssignmentStatus.ACCEPTED) {
        throw new ConflictException(
          'Only accepted assignments can report incidents and cancel the mission',
        );
      }

      if (
        ![RescueStatus.ACCEPTED, RescueStatus.IN_PROGRESS].includes(
          assignment.rescueRequest.status,
        )
      ) {
        throw new ConflictException(
          `Cannot report incident while rescue request is ${assignment.rescueRequest.status}`,
        );
      }

      const returnedOrder = await this.warehouseService.returnAssignmentSuppliesForIncident(
        assignment.id,
        accountId,
        incidentNote,
        manager,
      );

      assignment.status = AssignmentStatus.CANCELED;
      assignment.incidentNote = incidentNote;
      assignment.incidentReportedAt = new Date();
      assignment.progressNote = incidentNote;

      const updatedAssignments = (assignment.rescueRequest.assignments ?? []).map(
        (currentAssignment) =>
          currentAssignment.id === assignment.id ? assignment : currentAssignment,
      );

      const nextRescueStatus = this.resolveRescueStatusFromAssignments(
        updatedAssignments,
        assignment.rescueRequest.requiredTeams ?? 1,
      );

      await assignmentRepository.save(assignment);
      await rescueRepository.update(assignment.rescueRequestId, {
        status: nextRescueStatus,
      });

      return {
        assignment: await assignmentRepository.findOne({
          where: { id: assignment.id },
          relations: ['team', 'rescueRequest'],
        }),
        rescueRequest: await rescueRepository.findOne({
          where: { id: assignment.rescueRequestId },
          relations: ['assignments', 'assignments.team'],
        }),
        returnedOrder,
      };
    });
  }

  private async getAssignmentForTeamAccount(
    accountId: string,
    assignmentId: string,
    relations: string[],
  ) {
    const team = await this.resolveTeamForAccount(accountId);

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

  private async resolveTeamForAccount(accountId: string) {
    const membership = await this.teamMemberRepository.findOne({
      where: { accountId },
      relations: ['team'],
    });

    if (membership?.team) {
      return membership.team;
    }

    return this.teamRepository.findOne({ where: { accountId } });
  }

  private serializeTeamReview(review: TeamReview) {
    return {
      id: review.id,
      rescueRequestId: review.rescueRequestId,
      teamId: review.teamId,
      teamName: review.team?.name ?? null,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewer?.profile?.fullName ?? null,
      rating: review.rating,
      outcome: review.outcome,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private async refreshTeamRating(teamId: string) {
    const summary = await this.teamReviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('review.teamId = :teamId', { teamId })
      .getRawOne<{ averageRating: string | null; reviewCount: string }>();

    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new ResourceNotFoundException('Team', teamId);
    }

    team.rating = summary?.averageRating
      ? Number(Number(summary.averageRating).toFixed(2))
      : null;

    await this.teamRepository.save(team);
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

  private isActiveAssignmentStatus(status: AssignmentStatus) {
    return ![AssignmentStatus.CANCELED, AssignmentStatus.DECLINED].includes(
      status,
    );
  }

  private serializeRescueRequest(rescue: RescueRequest) {
    const assignedTeams = (rescue.assignments ?? [])
      .filter((assignment) => this.isActiveAssignmentStatus(assignment.status))
      .map((assignment) => ({
        assignmentId: assignment.id,
        teamId: assignment.teamId,
        teamName: assignment.team?.name ?? null,
        area: assignment.team?.area ?? null,
        teamSize: assignment.team?.teamSize ?? 0,
        status: assignment.status,
        respondedAt: assignment.respondedAt,
      }));

    const acceptedCount = assignedTeams.filter(
      (assignment) => assignment.status === AssignmentStatus.ACCEPTED,
    ).length;

    return {
      ...rescue,
      guestName: rescue.guestName ?? rescue.creator?.profile?.fullName ?? null,
      guestPhone: rescue.guestPhone ?? rescue.creator?.phone ?? null,
      assignedTeams,
      isAssigned: assignedTeams.length > 0,
      teamSummary: {
        required: rescue.requiredTeams ?? 1,
        assigned: assignedTeams.length,
        accepted: acceptedCount,
        isFulfilled: acceptedCount >= (rescue.requiredTeams ?? 1),
      },
    };
  }

  private resolveRescueStatusFromAssignments(
    assignments: RescueAssignment[],
    requiredTeams: number,
  ) {
    const activeAssignments = assignments.filter(
      (assignment) => this.isActiveAssignmentStatus(assignment.status),
    );
    const acceptedAssignments = activeAssignments.filter(
      (assignment) => assignment.status === AssignmentStatus.ACCEPTED,
    );

    if (acceptedAssignments.length >= requiredTeams && activeAssignments.length > 0) {
      return RescueStatus.ACCEPTED;
    }

    if (activeAssignments.length > 0) {
      return RescueStatus.ASSIGNED;
    }

    return RescueStatus.REVIEWED;
  }
}
