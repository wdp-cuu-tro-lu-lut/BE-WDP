import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Account,
  AccountRole,
  Allocation,
  AllocationStatus,
  AssignmentStatus,
  Profile,
  RescueAssignment,
  RescueSupplyTeamHandoffItem,
  RescueSupplyTeamHandoffStatus,
  RescueStatus,
  Team,
  TeamEquipment,
  TeamEquipmentStatus,
  TeamMember,
  TeamMemberRole,
  TeamMemberStatus,
  TeamRegistrationRequest,
  TeamRegistrationRequestStatus,
  TeamSpecialty,
  TeamVehicle,
  TeamVehicleStatus,
  VehicleType,
} from '@/database/entities';
import {
  CreateTeamRegistrationRequestDto,
  CreateTeamMemberDto,
  CreateTeamDto,
  ListMyTeamAllocationsQueryDto,
  ReviewTeamRegistrationRequestDto,
  TeamEquipmentDto,
  TeamVehicleDto,
  UpdateTeamDto,
  UpdateTeamMemberDto,
  ListTeamsQueryDto,
} from '@/teams/dto';
import {
  ConflictException,
  ResourceNotFoundException,
} from '@/common/exceptions';
import { RealtimeNotificationService } from '@/common/services/realtime-notification.service';
import { StaffNotificationService } from '@/dashboard/services';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(RescueAssignment)
    private assignmentRepository: Repository<RescueAssignment>,
    @InjectRepository(Allocation)
    private allocationRepository: Repository<Allocation>,
    @InjectRepository(RescueSupplyTeamHandoffItem)
    private rescueSupplyTeamHandoffItemRepository: Repository<RescueSupplyTeamHandoffItem>,
    @InjectRepository(VehicleType)
    private vehicleTypeRepository: Repository<VehicleType>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(TeamRegistrationRequest)
    private teamRegistrationRequestRepository: Repository<TeamRegistrationRequest>,
    private dataSource: DataSource,
    private readonly realtimeNotificationService: RealtimeNotificationService,
    private readonly staffNotificationService: StaffNotificationService,
  ) {}

  async createTeamRegistrationRequest(
    requestedById: string,
    createDto: CreateTeamRegistrationRequestDto,
  ) {
    await this.ensureAccountCanRequestTeam(requestedById);

    const pendingRequest = await this.teamRegistrationRequestRepository.findOne({
      where: {
        requestedById,
        status: TeamRegistrationRequestStatus.PENDING,
      },
    });

    if (pendingRequest) {
      throw new ConflictException('You already have a pending team registration request');
    }

    const request = this.teamRegistrationRequestRepository.create({
      requestedById,
      name: createDto.name.trim(),
      area: createDto.area?.trim() || null,
      teamSize: createDto.teamSize,
      baseLocation: createDto.baseLocation?.trim() || null,
      latitude: createDto.latitude ?? null,
      longitude: createDto.longitude ?? null,
      description: createDto.description?.trim() || null,
      specialties: createDto.specialties ?? [],
      equipmentList: createDto.equipmentList ?? [],
      vehicles: createDto.vehicles ?? [],
      status: TeamRegistrationRequestStatus.PENDING,
    });

    const savedRequest = await this.teamRegistrationRequestRepository.save(request);

    await this.staffNotificationService.createTeamRegistrationRequestCreatedNotifications(
      savedRequest,
    );
    this.realtimeNotificationService.notifyTeamRegistrationRequestCreated(
      savedRequest,
    );

    return this.getTeamRegistrationRequest(savedRequest.id);
  }

  async listMyTeamRegistrationRequests(requestedById: string) {
    const requests = await this.teamRegistrationRequestRepository.find({
      where: { requestedById },
      relations: ['requestedBy', 'requestedBy.profile', 'reviewedBy', 'reviewedBy.profile'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((request) => this.serializeTeamRegistrationRequest(request));
  }

  async listTeamRegistrationRequests() {
    const requests = await this.teamRegistrationRequestRepository.find({
      relations: ['requestedBy', 'requestedBy.profile', 'reviewedBy', 'reviewedBy.profile'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((request) => this.serializeTeamRegistrationRequest(request));
  }

  async getTeamRegistrationRequest(id: string) {
    const request = await this.teamRegistrationRequestRepository.findOne({
      where: { id },
      relations: ['requestedBy', 'requestedBy.profile', 'reviewedBy', 'reviewedBy.profile'],
    });

    if (!request) {
      throw new ResourceNotFoundException('Team registration request', id);
    }

    return this.serializeTeamRegistrationRequest(request);
  }

  async reviewTeamRegistrationRequest(
    id: string,
    reviewerId: string,
    reviewDto: ReviewTeamRegistrationRequestDto,
  ) {
    const request = await this.teamRegistrationRequestRepository.findOne({
      where: { id },
      relations: ['requestedBy', 'requestedBy.profile'],
    });

    if (!request) {
      throw new ResourceNotFoundException('Team registration request', id);
    }

    if (request.status !== TeamRegistrationRequestStatus.PENDING) {
      throw new ConflictException('This team registration request has already been reviewed');
    }

    const approvedTeamId = await this.dataSource.transaction(async (manager) => {
      request.status = reviewDto.status;
      request.reviewedById = reviewerId;
      request.reviewedAt = new Date();
      request.reviewNote = reviewDto.reviewNote?.trim() || null;

      if (reviewDto.status === TeamRegistrationRequestStatus.REJECTED) {
        await manager.getRepository(TeamRegistrationRequest).save(request);
        return null;
      }

      await this.ensureAccountCanRequestTeam(request.requestedById, manager);
      const createdTeam = await this.createTeamFromRegistrationRequest(manager, request);
      request.approvedTeamId = createdTeam.id;
      await manager.getRepository(TeamRegistrationRequest).save(request);
      return createdTeam.id;
    });

    if (approvedTeamId) {
      return this.getTeam(approvedTeamId);
    }

    return this.getTeamRegistrationRequest(id);
  }

  async listVehicleTypes() {
    const vehicleTypes = await this.vehicleTypeRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return vehicleTypes.map((vehicleType) => ({
      id: vehicleType.id,
      code: vehicleType.code,
      name: vehicleType.name,
      description: vehicleType.description,
      defaultCapacity: vehicleType.defaultCapacity,
      isActive: vehicleType.isActive,
    }));
  }

  async getMyTeam(accountId: string) {
    const context = await this.getTeamAccessContext(accountId);
    return this.getTeam(context.team.id);
  }

  async listMyTeamMembers(accountId: string) {
    const context = await this.getTeamAccessContext(accountId);
    return this.listTeamMembers(context.team.id);
  }

  async listMyTeamAllocations(
    accountId: string,
    query: ListMyTeamAllocationsQueryDto,
  ) {
    const context = await this.getTeamAccessContext(accountId);
    const { eventId, status, page = 1, limit = 20 } = query;

    let qb = this.allocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.items', 'items')
      .leftJoinAndSelect('allocation.team', 'team')
      .leftJoinAndSelect('allocation.event', 'event')
      .leftJoinAndSelect('allocation.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'createdByProfile')
      .where('allocation.teamId = :teamId', { teamId: context.team.id });

    if (eventId) {
      qb = qb.andWhere(
        new Brackets((eventQuery) => {
          eventQuery
            .where('allocation.eventId = :eventId', { eventId })
            .orWhere('allocation.eventId IS NULL');
        }),
      );
    }

    if (status) {
      qb = qb.andWhere('allocation.status = :status', { status });
    }

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const allocations = await qb
      .orderBy('allocation.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: allocations.map((allocation) => this.serializeTeamAllocation(allocation)),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getMyTeamAllocation(accountId: string, allocationId: string) {
    const { allocation } = await this.getMyTeamAllocationContext(accountId, allocationId);
    return this.serializeTeamAllocation(allocation);
  }

  async getMyTeamWarehouseSummary(accountId: string) {
    const context = await this.getTeamAccessContext(accountId);
    const teamId = context.team.id;

    const [allocationRows, handoffRows] = await Promise.all([
      this.allocationRepository
        .createQueryBuilder('allocation')
        .innerJoin('allocation.items', 'items')
        .select('items.category', 'category')
        .addSelect('COALESCE(SUM(items.quantity), 0)', 'quantity')
        .where('allocation.teamId = :teamId', { teamId })
        .andWhere('allocation.status = :status', {
          status: AllocationStatus.DELIVERED,
        })
        .groupBy('items.category')
        .getRawMany<{ category: string | null; quantity: string | number | null }>(),
      this.rescueSupplyTeamHandoffItemRepository
        .createQueryBuilder('handoffItem')
        .innerJoin('handoffItem.handoff', 'handoff')
        .leftJoin('handoffItem.category', 'category')
        .select(
          "COALESCE(NULLIF(TRIM(category.name), ''), handoffItem.categoryId)",
          'category',
        )
        .addSelect(
          'COALESCE(SUM(handoffItem.quantity - handoffItem.returnedQuantity), 0)',
          'quantity',
        )
        .where('handoff.teamId = :teamId', { teamId })
        .andWhere('handoff.status = :status', {
          status: RescueSupplyTeamHandoffStatus.RECEIVED,
        })
        .groupBy('category.name')
        .addGroupBy('handoffItem.categoryId')
        .having('SUM(handoffItem.quantity - handoffItem.returnedQuantity) > 0')
        .getRawMany<{ category: string | null; quantity: string | number | null }>(),
    ]);

    const quantityByCategory = new Map<string, number>();
    const mergeRows = (rows: Array<{ category: string | null; quantity: string | number | null }>) => {
      for (const row of rows) {
        if (!row.category) {
          continue;
        }

        const quantity = Number(row.quantity ?? 0);
        if (quantity <= 0) {
          continue;
        }

        quantityByCategory.set(
          row.category,
          (quantityByCategory.get(row.category) ?? 0) + quantity,
        );
      }
    };

    mergeRows(allocationRows);
    mergeRows(handoffRows);

    const breakdownByCategory = Array.from(quantityByCategory.entries())
      .map(([category, quantity]) => ({ category, quantity }))
      .sort((a, b) => b.quantity - a.quantity || a.category.localeCompare(b.category));

    const totalQuantity = breakdownByCategory.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return {
      totalQuantity,
      breakdownByCategory,
    };
  }

  async receiveMyTeamAllocation(accountId: string, allocationId: string) {
    const { allocation } = await this.getMyTeamAllocationContext(accountId, allocationId);

    if (allocation.status === AllocationStatus.DELIVERED) {
      return allocation;
    }

    if (
      ![AllocationStatus.CREATED, AllocationStatus.DISPATCHED].includes(
        allocation.status,
      )
    ) {
      throw new ConflictException('This allocation cannot be marked as received');
    }

    allocation.status = AllocationStatus.DELIVERED;
    await this.allocationRepository.save(allocation);

    return this.getMyTeamAllocation(accountId, allocationId);
  }

  async updateMyTeam(accountId: string, updateTeamDto: UpdateTeamDto) {
    const context = await this.getTeamLeaderContext(accountId);
    const { rating, isActive, ...allowedUpdates } = updateTeamDto;
    return this.updateTeam(context.team.id, allowedUpdates);
  }

  async addMyTeamMember(accountId: string, createTeamMemberDto: CreateTeamMemberDto) {
    const context = await this.getTeamLeaderContext(accountId);
    return this.addTeamMember(context.team.id, createTeamMemberDto);
  }

  async updateMyTeamMember(
    accountId: string,
    memberId: string,
    updateTeamMemberDto: UpdateTeamMemberDto,
  ) {
    const context = await this.getTeamLeaderContext(accountId);
    return this.updateTeamMember(context.team.id, memberId, updateTeamMemberDto);
  }

  async removeMyTeamMember(accountId: string, memberId: string) {
    const context = await this.getTeamLeaderContext(accountId);
    return this.removeTeamMember(context.team.id, memberId);
  }

  async disbandMyTeam(accountId: string) {
    const context = await this.getTeamLeaderContext(accountId);
    return this.deleteTeam(context.team.id);
  }

  async createTeam(createTeamDto: CreateTeamDto) {
    const {
      name,
      area,
      teamSize,
      accountEmail,
      accountPassword,
      accountFullName,
    } = createTeamDto;

    const createdTeamId = await this.dataSource.transaction(async (manager) => {
      const transactionalAccountRepository = manager.getRepository(Account);
      const transactionalProfileRepository = manager.getRepository(Profile);
      const transactionalTeamRepository = manager.getRepository(Team);

      const existingAccount = await transactionalAccountRepository.findOne({
        where: { email: accountEmail },
      });

      if (existingAccount) {
        throw new ConflictException('Email already exists');
      }

      const account = transactionalAccountRepository.create({
        email: accountEmail,
        passwordHash: await bcrypt.hash(accountPassword, 10),
        role: AccountRole.RESCUE_TEAM,
        isActive: true,
      });
      const savedAccount = await transactionalAccountRepository.save(account);

      const profile = transactionalProfileRepository.create({
        accountId: savedAccount.id,
        fullName: accountFullName?.trim() || name,
      });
      await transactionalProfileRepository.save(profile);

      const team = transactionalTeamRepository.create({
        name,
        area,
        teamSize,
        baseLocation: createTeamDto.baseLocation?.trim() || null,
        latitude: createTeamDto.latitude ?? null,
        longitude: createTeamDto.longitude ?? null,
        rating: createTeamDto.rating ?? null,
        accountId: savedAccount.id,
      });
      const savedTeam = await transactionalTeamRepository.save(team);

      await this.ensureLeaderMembership(manager, savedTeam.id, savedAccount.id);

      await this.replaceTeamRelations(manager, savedTeam.id, {
        specialties: createTeamDto.specialties,
        equipmentList: createTeamDto.equipmentList,
        vehicles: createTeamDto.vehicles,
      });

      return savedTeam.id;
    });

    return this.getTeam(createdTeamId);
  }

  async getTeam(id: string) {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: [
        'account',
        'account.profile',
        'specialties',
        'equipment',
        'vehicles',
        'vehicles.vehicleType',
        'teamMembers',
        'teamMembers.account',
        'teamMembers.account.profile',
      ],
    });
    if (!team) {
      throw new ResourceNotFoundException('Team', id);
    }

    const [assignments, allocations] = await Promise.all([
      this.assignmentRepository.find({
        where: { teamId: team.id },
        relations: ['rescueRequest'],
        order: { createdAt: 'DESC' },
      }),
      this.allocationRepository.find({
        where: { teamId: team.id },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return this.toTeamDetailResponse(team, assignments, allocations);
  }

  async listTeamMembers(teamId: string) {
    const team = await this.loadTeamWithDetails(teamId);
    return this.buildTeamMembers(team);
  }

  async addTeamMember(teamId: string, createTeamMemberDto: CreateTeamMemberDto) {
    await this.loadTeamWithDetails(teamId);

    const createdMembershipId = await this.dataSource.transaction(async (manager) => {
      const accountRepository = manager.getRepository(Account);
      const profileRepository = manager.getRepository(Profile);
      const membershipRepository = manager.getRepository(TeamMember);

      const existingAccount = await accountRepository.findOne({
        where: [{ email: createTeamMemberDto.email }, ...(createTeamMemberDto.phone ? [{ phone: createTeamMemberDto.phone }] : [])],
      });

      if (existingAccount) {
        throw new ConflictException('Account email or phone already exists');
      }

      const account = accountRepository.create({
        email: createTeamMemberDto.email,
        phone: createTeamMemberDto.phone?.trim() || undefined,
        passwordHash: await bcrypt.hash(createTeamMemberDto.password, 10),
        role: AccountRole.RESCUE_TEAM,
        isActive: createTeamMemberDto.isActive ?? true,
      });
      const savedAccount = await accountRepository.save(account);

      const profile = profileRepository.create({
        accountId: savedAccount.id,
        fullName: createTeamMemberDto.fullName.trim(),
        address: createTeamMemberDto.address?.trim() || undefined,
      });
      await profileRepository.save(profile);

      const membership = membershipRepository.create({
        teamId,
        accountId: savedAccount.id,
        role: createTeamMemberDto.role ?? TeamMemberRole.MEMBER,
        status: createTeamMemberDto.status ?? TeamMemberStatus.ACTIVE,
      });

      if (membership.role === TeamMemberRole.TEAM_LEADER) {
        membership.status = TeamMemberStatus.ACTIVE;
        await membershipRepository.save(membership);
        await this.promoteTeamLeader(manager, teamId, membership.accountId!);
      } else {
        await membershipRepository.save(membership);
      }

      return membership.id;
    });

    return this.getTeamMember(teamId, createdMembershipId);
  }

  async updateTeamMember(
    teamId: string,
    memberId: string,
    updateTeamMemberDto: UpdateTeamMemberDto,
  ) {
    await this.loadTeamWithDetails(teamId);

    await this.dataSource.transaction(async (manager) => {
      const membershipRepository = manager.getRepository(TeamMember);
      const accountRepository = manager.getRepository(Account);
      const profileRepository = manager.getRepository(Profile);

      const membership = await membershipRepository.findOne({
        where: { id: memberId, teamId },
        relations: ['account', 'account.profile'],
      });

      if (!membership) {
        throw new ResourceNotFoundException('Team member', memberId);
      }

      const targetRole = updateTeamMemberDto.role ?? membership.role;
      const targetStatus = updateTeamMemberDto.status ?? membership.status;

      if (
        membership.role === TeamMemberRole.TEAM_LEADER &&
        updateTeamMemberDto.role === TeamMemberRole.MEMBER
      ) {
        throw new BadRequestException(
          'Current team leader cannot be demoted directly. Promote another member first.',
        );
      }

      if (targetRole === TeamMemberRole.TEAM_LEADER && targetStatus !== TeamMemberStatus.ACTIVE) {
        throw new BadRequestException('Team leader must be active');
      }

      if (updateTeamMemberDto.phone !== undefined) {
        const normalizedPhone = updateTeamMemberDto.phone.trim();
        const phoneOwner = normalizedPhone
          ? await accountRepository.findOne({ where: { phone: normalizedPhone } })
          : null;

        if (phoneOwner && phoneOwner.id !== membership.accountId) {
          throw new ConflictException('Phone already exists');
        }

        membership.account.phone = normalizedPhone || undefined;
      }

      if (updateTeamMemberDto.isActive !== undefined) {
        membership.account.isActive = updateTeamMemberDto.isActive;
        if (!updateTeamMemberDto.isActive && targetRole === TeamMemberRole.TEAM_LEADER) {
          throw new BadRequestException('Current team leader must keep an active account');
        }
      }

      if (updateTeamMemberDto.fullName !== undefined) {
        membership.account.profile.fullName = updateTeamMemberDto.fullName.trim();
      }

      if (updateTeamMemberDto.address !== undefined) {
        membership.account.profile.address = updateTeamMemberDto.address.trim() || undefined;
      }

      membership.status = targetStatus;
      membership.role = targetRole;

      await accountRepository.save(membership.account);
      await profileRepository.save(membership.account.profile);
      await membershipRepository.save(membership);

      if (targetRole === TeamMemberRole.TEAM_LEADER) {
        await this.promoteTeamLeader(manager, teamId, membership.accountId!);
      }
    });

    return this.getTeamMember(teamId, memberId);
  }

  async removeTeamMember(teamId: string, memberId: string) {
    await this.dataSource.transaction(async (manager) => {
      const membershipRepository = manager.getRepository(TeamMember);
      const teamRepository = manager.getRepository(Team);

      const membership = await membershipRepository.findOne({
        where: { id: memberId, teamId },
      });

      if (!membership) {
        throw new ResourceNotFoundException('Team member', memberId);
      }

      const team = await teamRepository.findOne({ where: { id: teamId } });
      if (!team) {
        throw new ResourceNotFoundException('Team', teamId);
      }

      if (
        membership.role === TeamMemberRole.TEAM_LEADER ||
        team.accountId === membership.accountId
      ) {
        throw new BadRequestException('Current team leader cannot be removed');
      }

      await this.softDeleteTeamMembers(manager, teamId, [membership]);
    });

    return { success: true };
  }

  async listTeams(query: ListTeamsQueryDto) {
    const {
      isActive,
      q,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'DESC',
    } = query;

    let qb = this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.account', 'account')
      .leftJoinAndSelect('account.profile', 'profile')
      .loadRelationCountAndMap(
        'team.totalVehicles',
        'team.vehicles',
        'vehicle',
        (vehicleQb) => vehicleQb.andWhere('vehicle.deletedAt IS NULL'),
      );

    if (isActive === false) {
      qb = qb.withDeleted();
    }

    if (isActive !== undefined) {
      if (isActive) {
        qb = qb.where(
          'team.isActive = true AND (account.id IS NULL OR account.isActive = true)',
        );
      } else {
        qb = qb.where(
          '(team.isActive = false OR (account.id IS NOT NULL AND account.isActive = false))',
        );
      }
    }

    if (q) {
      qb = qb.andWhere(
        '(team.name LIKE :q OR team.area LIKE :q)',
        { q: `%${q}%` },
      );
    }

    const total = await qb.getCount();

    const skip = (page - 1) * limit;
    const teams = await qb
      .orderBy(`team.${sortBy}`, order)
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: teams.map((team) => this.toTeamResponse(team)),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateTeam(id: string, updateTeamDto: UpdateTeamDto) {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: [
        'account',
        'account.profile',
        'specialties',
        'equipment',
        'vehicles',
        'vehicles.vehicleType',
        'teamMembers',
        'teamMembers.account',
        'teamMembers.account.profile',
      ],
    });

    if (!team) {
      throw new ResourceNotFoundException('Team', id);
    }

    const previousTeamName = team.name;

    if (updateTeamDto.name !== undefined) {
      team.name = updateTeamDto.name;
    }
    if (updateTeamDto.area !== undefined) {
      team.area = updateTeamDto.area;
    }
    if (updateTeamDto.teamSize !== undefined) {
      team.teamSize = updateTeamDto.teamSize;
    }
    if (updateTeamDto.baseLocation !== undefined) {
      team.baseLocation = updateTeamDto.baseLocation?.trim() || null;
    }
    if (updateTeamDto.latitude !== undefined) {
      team.latitude = updateTeamDto.latitude;
    }
    if (updateTeamDto.longitude !== undefined) {
      team.longitude = updateTeamDto.longitude;
    }
    if (updateTeamDto.rating !== undefined) {
      team.rating = updateTeamDto.rating;
    }
    if (updateTeamDto.isActive !== undefined) {
      team.isActive = updateTeamDto.isActive;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Team).save(team);

      if (team.account && updateTeamDto.isActive !== undefined) {
        team.account.isActive = updateTeamDto.isActive;
        await manager.getRepository(Account).save(team.account);
      }

      if (
        team.account?.profile &&
        updateTeamDto.name !== undefined &&
        team.account.profile.fullName === previousTeamName
      ) {
        team.account.profile.fullName = updateTeamDto.name;
        await manager.getRepository(Profile).save(team.account.profile);
      }

      if (updateTeamDto.specialties !== undefined) {
        await this.replaceTeamSpecialties(manager, team.id, updateTeamDto.specialties);
      }

      if (updateTeamDto.equipmentList !== undefined) {
        await this.replaceTeamEquipment(manager, team.id, updateTeamDto.equipmentList);
      }

      if (updateTeamDto.vehicles !== undefined) {
        await this.replaceTeamVehicles(manager, team.id, updateTeamDto.vehicles);
      }
    });

    return this.getTeam(id);
  }

  async deleteTeam(id: string) {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['account', 'teamMembers'],
    });

    if (!team) {
      throw new ResourceNotFoundException('Team', id);
    }

    await this.dataSource.transaction(async (manager) => {
      await this.softDeleteTeamMembers(manager, team.id);
      await this.softDeleteTeamSpecialties(manager, team.id);
      await this.softDeleteTeamEquipment(manager, team.id);
      await this.softDeleteTeamVehicles(manager, team.id);

      if (team.account) {
        await this.archiveAccountForSoftDelete(manager, team.account);
      }

      await manager.getRepository(Team).update(team.id, {
        isActive: false,
        accountId: null,
      });
      await manager.getRepository(Team).softDelete(team.id);
    });

    return { success: true };
  }

  private toTeamResponse(team: Team) {
    const totalVehicles =
      (team as Team & { totalVehicles?: number }).totalVehicles ??
      team.vehicles?.length ??
      0;

    const isActive = this.isTeamEffectivelyActive(team);

    return {
      id: team.id,
      name: team.name,
      area: team.area,
      teamSize: team.teamSize,
      totalVehicles,
      baseLocation: team.baseLocation,
      latitude: team.latitude,
      longitude: team.longitude,
      rating: team.rating,
      accountId: team.accountId,
      isActive,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      account: team.account
        ? {
            id: team.account.id,
            email: team.account.email,
            phone: team.account.phone,
            role: team.account.role,
            isActive: team.account.isActive,
            fullName: team.account.profile?.fullName,
          }
        : null,
    };
  }

  private toTeamDetailResponse(
    team: Team,
    assignments: RescueAssignment[],
    allocations: Allocation[],
  ) {
    const isActive = this.isTeamEffectivelyActive(team);
    const acceptedAssignments = assignments.filter(
      (assignment) => assignment.status === AssignmentStatus.ACCEPTED,
    );

    const successfulMissionStatuses = [RescueStatus.DONE];
    const failedMissionStatuses = [
      RescueStatus.CANCELED,
      RescueStatus.REJECTED,
    ];

    const successfulMissions = acceptedAssignments.filter((assignment) =>
      successfulMissionStatuses.includes(assignment.rescueRequest?.status),
    ).length;

    const failedMissions = acceptedAssignments.filter((assignment) =>
      failedMissionStatuses.includes(assignment.rescueRequest?.status),
    ).length;

    const respondedAssignments = acceptedAssignments.filter(
      (assignment) => assignment.respondedAt,
    );

    const averageResponseTime = respondedAssignments.length
      ? Math.round(
          respondedAssignments.reduce((total, assignment) => {
            const respondedAt = assignment.respondedAt.getTime();
            const createdAt = assignment.createdAt.getTime();
            return total + Math.max(0, respondedAt - createdAt);
          }, 0) /
            respondedAssignments.length /
            60000,
        )
      : null;

    const lastMissionAt = acceptedAssignments.reduce<Date | null>(
      (latest, assignment) => {
        const candidate = assignment.respondedAt ?? assignment.updatedAt;
        if (!candidate) {
          return latest;
        }

        if (!latest || candidate > latest) {
          return candidate;
        }

        return latest;
      },
      null,
    );

    const hasMissionInProgress = acceptedAssignments.some((assignment) =>
      [RescueStatus.ACCEPTED, RescueStatus.IN_PROGRESS].includes(
        assignment.rescueRequest?.status,
      ),
    );

    const hasPendingWork =
      assignments.some((assignment) => assignment.status === AssignmentStatus.SENT) ||
      allocations.some((allocation) =>
        [AllocationStatus.CREATED, AllocationStatus.DISPATCHED].includes(
          allocation.status,
        ),
      );

    const status = !isActive
      ? 'offline'
      : hasMissionInProgress
        ? 'on_mission'
        : hasPendingWork
          ? 'busy'
          : 'available';

    const members = this.buildTeamMembers(team);
    const totalMembers = members.length > 0 ? members.length : team.teamSize;

    return {
      ...this.toTeamResponse(team),
      team_id: team.id,
      team_code: null,
      created_at: team.createdAt,
      team_name: team.name,
      status,
      location: {
        lat: team.latitude,
        lng: team.longitude,
        base_location: team.baseLocation,
        coverage_area: team.area ?? null,
      },
      capacity: {
        max_victims: team.teamSize > 0 ? team.teamSize * 4 : null,
        vehicles: team.vehicles?.length ?? 0,
      },
      specialties: (team.specialties ?? []).map((specialty) => specialty.code),
      members,
      totalMembers,
      rating: team.rating,
      equipment_list: (team.equipment ?? []).map((equipment) => ({
        equipment_id: equipment.id,
        equipment_name: equipment.equipmentName,
        quantity: equipment.quantity,
        status: equipment.status,
      })),
      vehicles: (team.vehicles ?? []).map((vehicle) => ({
        vehicle_id: vehicle.id,
        vehicle_type_id: vehicle.vehicleTypeId,
        vehicle_type_code: vehicle.vehicleType?.code ?? null,
        vehicle_type: vehicle.vehicleType?.name ?? null,
        plate_number: vehicle.plateNumber,
        capacity: vehicle.capacity,
        status: vehicle.status,
      })),
      total_missions: acceptedAssignments.length,
      successful_missions: successfulMissions,
      failed_missions: failedMissions,
      average_response_time: averageResponseTime,
      last_mission_at: lastMissionAt,
    };
  }

  private buildTeamMembers(team: Team) {
    if ((team.teamMembers?.length ?? 0) > 0) {
      return team.teamMembers.map((teamMember) => ({
        membership_id: teamMember.id,
        member_id: teamMember.accountId,
        account_id: teamMember.accountId,
        full_name:
          teamMember.account?.profile?.fullName ??
          teamMember.account?.email ??
          team.name,
        email: teamMember.account?.email ?? null,
        phone: teamMember.account?.phone ?? '',
        role: teamMember.role,
        status: teamMember.status,
        joined_at: teamMember.joinedAt,
        is_leader: teamMember.role === TeamMemberRole.TEAM_LEADER,
      }));
    }

    if (!team.account) {
      return [];
    }

    return [
      {
        membership_id: null,
        member_id: team.account.id,
        account_id: team.account.id,
        full_name: team.account.profile?.fullName ?? team.name,
        email: team.account.email ?? null,
        phone: team.account.phone ?? '',
        role: TeamMemberRole.TEAM_LEADER,
        status: team.account.isActive
          ? TeamMemberStatus.ACTIVE
          : TeamMemberStatus.INACTIVE,
        joined_at: team.createdAt,
        is_leader: true,
      },
    ];
  }

  private isTeamEffectivelyActive(team: Team) {
    if (!team.isActive) {
      return false;
    }

    if (team.account && team.account.isActive === false) {
      return false;
    }

    return true;
  }

  private serializeTeamAllocation(allocation: Allocation) {
    const createdBy = allocation.createdBy
      ? (() => {
          const { passwordHash, ...safeCreatedBy } = allocation.createdBy;
          return safeCreatedBy;
        })()
      : null;

    return {
      ...allocation,
      createdBy,
    };
  }

  private serializeTeamRegistrationRequest(request: TeamRegistrationRequest) {
    return {
      id: request.id,
      name: request.name,
      area: request.area,
      teamSize: request.teamSize,
      baseLocation: request.baseLocation,
      latitude: request.latitude,
      longitude: request.longitude,
      description: request.description,
      specialties: request.specialties ?? [],
      equipmentList: request.equipmentList ?? [],
      vehicles: request.vehicles ?? [],
      status: request.status,
      reviewNote: request.reviewNote,
      approvedTeamId: request.approvedTeamId,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      requestedBy: request.requestedBy
        ? {
            id: request.requestedBy.id,
            email: request.requestedBy.email,
            phone: request.requestedBy.phone,
            fullName: request.requestedBy.profile?.fullName ?? null,
          }
        : null,
      reviewedBy: request.reviewedBy
        ? {
            id: request.reviewedBy.id,
            email: request.reviewedBy.email,
            fullName: request.reviewedBy.profile?.fullName ?? null,
          }
        : null,
    };
  }

  private async getTeamAccessContext(accountId: string) {
    const membership = await this.teamMemberRepository.findOne({
      where: { accountId },
      relations: ['team'],
    });

    if (membership?.team) {
      return {
        team: membership.team,
        membership,
        isLeader: membership.role === TeamMemberRole.TEAM_LEADER,
      };
    }

    const team = await this.teamRepository.findOne({ where: { accountId } });
    if (team) {
      return {
        team,
        membership: null,
        isLeader: true,
      };
    }

    throw new ForbiddenException('This account is not linked to any rescue team');
  }

  private async getMyTeamAllocationContext(accountId: string, allocationId: string) {
    const context = await this.getTeamAccessContext(accountId);
    const allocation = await this.allocationRepository.findOne({
      where: { id: allocationId, teamId: context.team.id },
      relations: ['items', 'team', 'event', 'createdBy', 'createdBy.profile'],
    });

    if (!allocation) {
      throw new ResourceNotFoundException('Allocation', allocationId);
    }

    return { context, allocation };
  }

  private async getTeamLeaderContext(accountId: string) {
    const context = await this.getTeamAccessContext(accountId);

    if (!context.isLeader) {
      throw new ForbiddenException('Only the team leader can perform this action');
    }

    return context;
  }

  private async ensureAccountCanRequestTeam(
    accountId: string,
    manager?: DataSource['manager'],
  ) {
    const accountRepository = manager?.getRepository(Account) ?? this.accountRepository;
    const teamRepository = manager?.getRepository(Team) ?? this.teamRepository;
    const teamMemberRepository =
      manager?.getRepository(TeamMember) ?? this.teamMemberRepository;

    const account = await accountRepository.findOne({ where: { id: accountId } });
    if (!account) {
      throw new ResourceNotFoundException('Account', accountId);
    }

    const [managedTeam, membership] = await Promise.all([
      teamRepository.findOne({ where: { accountId } }),
      teamMemberRepository.findOne({ where: { accountId } }),
    ]);

    if (managedTeam || membership) {
      throw new ConflictException('This account is already linked to a rescue team');
    }

    return account;
  }

  private async createTeamFromRegistrationRequest(
    manager: DataSource['manager'],
    request: TeamRegistrationRequest,
  ) {
    const accountRepository = manager.getRepository(Account);
    const teamRepository = manager.getRepository(Team);

    const account = await accountRepository.findOne({
      where: { id: request.requestedById },
      relations: ['profile'],
    });

    if (!account) {
      throw new ResourceNotFoundException('Account', request.requestedById);
    }

    account.role = AccountRole.RESCUE_TEAM;
    account.isActive = true;
    await accountRepository.save(account);

    const team = teamRepository.create();
    team.name = request.name;
    team.area = request.area ?? '';
    team.teamSize = request.teamSize;
    team.baseLocation = request.baseLocation;
    team.latitude = request.latitude;
    team.longitude = request.longitude;
    team.rating = null;
    team.accountId = request.requestedById;
    team.isActive = true;
    const savedTeam = await teamRepository.save(team);

    await this.ensureLeaderMembership(manager, savedTeam.id, request.requestedById);
    await this.replaceTeamRelations(manager, savedTeam.id, {
      specialties: request.specialties ?? [],
      equipmentList: (request.equipmentList ?? []) as TeamEquipmentDto[],
      vehicles: (request.vehicles ?? []) as TeamVehicleDto[],
    });

    return savedTeam;
  }

  private async getTeamMember(teamId: string, memberId: string) {
    const team = await this.loadTeamWithDetails(teamId);
    const member = this.buildTeamMembers(team).find(
      (teamMember) => teamMember.membership_id === memberId,
    );

    if (!member) {
      throw new ResourceNotFoundException('Team member', memberId);
    }

    return member;
  }

  private async loadTeamWithDetails(teamId: string) {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: [
        'account',
        'account.profile',
        'specialties',
        'equipment',
        'vehicles',
        'vehicles.vehicleType',
        'teamMembers',
        'teamMembers.account',
        'teamMembers.account.profile',
      ],
      order: {
        teamMembers: {
          joinedAt: 'ASC',
        },
      },
    });

    if (!team) {
      throw new ResourceNotFoundException('Team', teamId);
    }

    return team;
  }

  private async promoteTeamLeader(
    manager: DataSource['manager'],
    teamId: string,
    accountId: string,
  ) {
    const teamRepository = manager.getRepository(Team);
    const membershipRepository = manager.getRepository(TeamMember);
    const accountRepository = manager.getRepository(Account);

    const team = await teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new ResourceNotFoundException('Team', teamId);
    }

    const memberships = await membershipRepository.find({ where: { teamId } });
    const targetMembership = memberships.find(
      (membership) => membership.accountId === accountId,
    );

    if (!targetMembership) {
      throw new ResourceNotFoundException('Team member account', accountId);
    }

    memberships.forEach((membership) => {
      membership.role =
        membership.accountId === accountId
          ? TeamMemberRole.TEAM_LEADER
          : TeamMemberRole.MEMBER;

      if (membership.accountId === accountId) {
        membership.status = TeamMemberStatus.ACTIVE;
      }
    });

    team.accountId = accountId;
    await membershipRepository.save(memberships);
    await teamRepository.save(team);

    await accountRepository.update(accountId, {
      isActive: true,
      role: AccountRole.RESCUE_TEAM,
    });
  }

  private async ensureLeaderMembership(
    manager: DataSource['manager'],
    teamId: string,
    accountId: string,
  ) {
    const membershipRepository = manager.getRepository(TeamMember);
    const existingMembership = await membershipRepository.findOne({
      where: { accountId },
    });

    if (existingMembership && existingMembership.teamId !== teamId) {
      throw new ConflictException('Account already belongs to another team');
    }

    const membership = existingMembership ??
      membershipRepository.create({
        teamId,
        accountId,
      });

    membership.teamId = teamId;
    membership.accountId = accountId;
    membership.role = TeamMemberRole.TEAM_LEADER;
    membership.status = TeamMemberStatus.ACTIVE;

    await membershipRepository.save(membership);
  }

  private async replaceTeamRelations(
    manager: DataSource['manager'],
    teamId: string,
    data: {
      specialties?: string[];
      equipmentList?: TeamEquipmentDto[];
      vehicles?: TeamVehicleDto[];
    },
  ) {
    await Promise.all([
      this.replaceTeamSpecialties(manager, teamId, data.specialties ?? []),
      this.replaceTeamEquipment(manager, teamId, data.equipmentList ?? []),
      this.replaceTeamVehicles(manager, teamId, data.vehicles ?? []),
    ]);
  }

  private async replaceTeamSpecialties(
    manager: DataSource['manager'],
    teamId: string,
    specialties: string[],
  ) {
    await this.softDeleteTeamSpecialties(manager, teamId);

    if (specialties.length === 0) {
      return;
    }

    const rows = specialties
      .map((specialty) => specialty.trim())
      .filter((specialty) => specialty.length > 0)
      .map((specialty) =>
        manager.getRepository(TeamSpecialty).create({
          teamId,
          code: specialty,
        }),
      );

    if (rows.length > 0) {
      await manager.getRepository(TeamSpecialty).save(rows);
    }
  }

  private async replaceTeamEquipment(
    manager: DataSource['manager'],
    teamId: string,
    equipmentList: TeamEquipmentDto[],
  ) {
    await this.softDeleteTeamEquipment(manager, teamId);

    if (equipmentList.length === 0) {
      return;
    }

    const rows = equipmentList
      .filter((equipment) => equipment.equipmentName.trim().length > 0)
      .map((equipment) =>
        manager.getRepository(TeamEquipment).create({
          teamId,
          equipmentName: equipment.equipmentName.trim(),
          quantity: equipment.quantity,
          status: equipment.status ?? TeamEquipmentStatus.READY,
        }),
      );

    if (rows.length > 0) {
      await manager.getRepository(TeamEquipment).save(rows);
    }
  }

  private async replaceTeamVehicles(
    manager: DataSource['manager'],
    teamId: string,
    vehicles: TeamVehicleDto[],
  ) {
    await this.softDeleteTeamVehicles(manager, teamId);

    if (vehicles.length === 0) {
      return;
    }

    const normalizedCodes = vehicles
      .map((vehicle) => vehicle.vehicleTypeCode.trim().toLowerCase())
      .filter((code) => code.length > 0);

    const vehicleTypes = normalizedCodes.length
      ? await manager.getRepository(VehicleType).find({
          where: normalizedCodes.map((code) => ({ code })),
        })
      : [];

    const vehicleTypeMap = new Map(
      vehicleTypes.map((vehicleType) => [vehicleType.code.toLowerCase(), vehicleType]),
    );

    const rows = vehicles
      .filter(
        (vehicle) =>
          vehicle.vehicleTypeCode.trim().length > 0 &&
          vehicle.plateNumber.trim().length > 0,
      )
      .map((vehicle) => {
        const vehicleType = vehicleTypeMap.get(
          vehicle.vehicleTypeCode.trim().toLowerCase(),
        );

        if (!vehicleType) {
          throw new ConflictException(
            `Vehicle type not found: ${vehicle.vehicleTypeCode}`,
          );
        }

        return manager.getRepository(TeamVehicle).create({
          teamId,
          vehicleTypeId: vehicleType.id,
          plateNumber: vehicle.plateNumber.trim(),
          capacity: vehicle.capacity,
          status: vehicle.status ?? TeamVehicleStatus.READY,
        });
      });

    if (rows.length > 0) {
      await manager.getRepository(TeamVehicle).save(rows);
    }
  }

  private async softDeleteTeamMembers(
    manager: DataSource['manager'],
    teamId: string,
    memberships?: TeamMember[],
  ) {
    const membershipRepository = manager.getRepository(TeamMember);
    const rows = memberships ?? (await membershipRepository.find({ where: { teamId } }));

    if (rows.length === 0) {
      return;
    }

    rows.forEach((membership) => {
      membership.archivedAccountId = membership.accountId;
      membership.accountId = null;
    });

    await membershipRepository.save(rows);
    await membershipRepository.softRemove(rows);
  }

  private async softDeleteTeamSpecialties(
    manager: DataSource['manager'],
    teamId: string,
  ) {
    const specialtyRepository = manager.getRepository(TeamSpecialty);
    const rows = await specialtyRepository.find({ where: { teamId } });

    if (rows.length === 0) {
      return;
    }

    await specialtyRepository.softRemove(rows);
  }

  private async softDeleteTeamEquipment(
    manager: DataSource['manager'],
    teamId: string,
  ) {
    const equipmentRepository = manager.getRepository(TeamEquipment);
    const rows = await equipmentRepository.find({ where: { teamId } });

    if (rows.length === 0) {
      return;
    }

    await equipmentRepository.softRemove(rows);
  }

  private async softDeleteTeamVehicles(
    manager: DataSource['manager'],
    teamId: string,
  ) {
    const vehicleRepository = manager.getRepository(TeamVehicle);
    const rows = await vehicleRepository.find({ where: { teamId } });

    if (rows.length === 0) {
      return;
    }

    rows.forEach((vehicle) => {
      vehicle.plateNumber = this.buildArchivedPlateNumber(vehicle.plateNumber, vehicle.id);
    });

    await vehicleRepository.save(rows);
    await vehicleRepository.softRemove(rows);
  }

  private async archiveAccountForSoftDelete(
    manager: DataSource['manager'],
    account: Account,
  ) {
    account.isActive = false;
    account.email = account.email
      ? this.buildArchivedEmail(account.id)
      : undefined;
    account.phone = account.phone
      ? this.buildArchivedPhone(account.id)
      : undefined;

    const accountRepository = manager.getRepository(Account);
    await accountRepository.save(account);
    await accountRepository.softDelete(account.id);
  }

  private buildArchivedPlateNumber(plateNumber: string, vehicleId: string) {
    const suffix = `#del#${vehicleId.slice(0, 8)}`;
    const maxBaseLength = Math.max(0, 50 - suffix.length);
    return `${plateNumber.slice(0, maxBaseLength)}${suffix}`;
  }

  private buildArchivedEmail(accountId: string) {
    return `deleted+${accountId}@wdp.local`;
  }

  private buildArchivedPhone(accountId: string) {
    return `d${accountId.replace(/-/g, '').slice(0, 19)}`;
  }
}
