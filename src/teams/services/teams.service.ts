import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Account, AccountRole, Profile, Team } from '@/database/entities';
import {
  CreateTeamDto,
  UpdateTeamDto,
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
    private dataSource: DataSource,
  ) {}

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
        accountId: savedAccount.id,
      });
      const savedTeam = await transactionalTeamRepository.save(team);

      return savedTeam.id;
    });

    return this.getTeam(createdTeamId);
  }

  async getTeam(id: string) {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['account', 'account.profile'],
    });
    if (!team) {
      throw new ResourceNotFoundException('Team', id);
    }
    return this.toTeamResponse(team);
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
      relations: ['account', 'account.profile'],
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
}
