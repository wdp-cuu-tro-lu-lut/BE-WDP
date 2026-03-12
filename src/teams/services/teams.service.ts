import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Account,
  AccountRole,
  Allocation,
  AllocationStatus,
  AssignmentStatus,
  Profile,
  RescueAssignment,
  RescueStatus,
  Team,
  TeamEquipment,
  TeamEquipmentStatus,
  TeamMember,
  TeamMemberRole,
  TeamMemberStatus,
  TeamSpecialty,
  TeamVehicle,
  TeamVehicleStatus,
  VehicleType,
} from '@/database/entities';
import {
  CreateTeamMemberDto,
  CreateTeamDto,
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
    @InjectRepository(VehicleType)
    private vehicleTypeRepository: Repository<VehicleType>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    private dataSource: DataSource,
  ) {}

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
        await this.promoteTeamLeader(manager, teamId, membership.accountId);
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
        await this.promoteTeamLeader(manager, teamId, membership.accountId);
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

      await membershipRepository.delete({ id: memberId, teamId });
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
      .leftJoinAndSelect('account.profile', 'profile');

    if (isActive !== undefined) {
      qb = qb.where('team.isActive = :isActive', { isActive });
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
      relations: ['account'],
    });

    if (!team) {
      throw new ResourceNotFoundException('Team', id);
    }

    await this.dataSource.transaction(async (manager) => {
      team.isActive = false;
      await manager.getRepository(Team).save(team);

      if (team.account) {
        team.account.isActive = false;
        await manager.getRepository(Account).save(team.account);
      }

      await manager.getRepository(Team).softRemove(team);
    });

    return { success: true };
  }

  private toTeamResponse(team: Team) {
    return {
      id: team.id,
      name: team.name,
      area: team.area,
      teamSize: team.teamSize,
      baseLocation: team.baseLocation,
      latitude: team.latitude,
      longitude: team.longitude,
      rating: team.rating,
      accountId: team.accountId,
      isActive: team.isActive,
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

    const status = !team.isActive
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
    await manager.getRepository(TeamSpecialty).delete({ teamId });

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
    await manager.getRepository(TeamEquipment).delete({ teamId });

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
    await manager.getRepository(TeamVehicle).delete({ teamId });

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
}
