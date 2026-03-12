import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Account,
  Profile,
  Team,
  TeamMember,
  TeamMemberRole,
  TeamMemberStatus,
} from '@/database/entities';
import { UpdateProfileDto } from '@/me/dto';
import { ResourceNotFoundException } from '@/common/exceptions';

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
  ) {}

  async getMe(accountId: string) {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: ['profile'],
    });

    if (!account) {
      throw new ResourceNotFoundException('Account', accountId);
    }

    const team = await this.resolveTeamForAccount(accountId);

    return {
      id: account.id,
      email: account.email,
      phone: account.phone,
      role: account.role,
      isActive: account.isActive,
      profile: account.profile,
      team,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  async updateProfile(accountId: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.profileRepository.findOne({
      where: { accountId },
    });

    if (!profile) {
      throw new ResourceNotFoundException('Profile', accountId);
    }

    Object.assign(profile, updateProfileDto);
    const updated = await this.profileRepository.save(profile);

    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: ['profile'],
    });

    if (!account) {
      throw new ResourceNotFoundException('Account', accountId);
    }

    const team = await this.resolveTeamForAccount(accountId);

    return {
      id: account.id,
      email: account.email,
      phone: account.phone,
      role: account.role,
      profile: updated,
      team,
    };
  }

  private async resolveTeamForAccount(accountId: string) {
    const membership = await this.teamMemberRepository.findOne({
      where: { accountId },
      relations: ['team'],
    });

    if (membership?.team) {
      return this.serializeTeamSummary(membership.team, membership);
    }

    const team = await this.teamRepository.findOne({
      where: { accountId },
    });

    if (!team) {
      return null;
    }

    return this.serializeTeamSummary(team, {
      role: TeamMemberRole.TEAM_LEADER,
      status: team.isActive ? TeamMemberStatus.ACTIVE : TeamMemberStatus.INACTIVE,
      joinedAt: team.createdAt,
    });
  }

  private serializeTeamSummary(
    team: Team,
    membership: Pick<TeamMember, 'role' | 'status' | 'joinedAt'>,
  ) {
    return {
      id: team.id,
      name: team.name,
      area: team.area,
      baseLocation: team.baseLocation,
      isActive: team.isActive,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,
    };
  }
}
