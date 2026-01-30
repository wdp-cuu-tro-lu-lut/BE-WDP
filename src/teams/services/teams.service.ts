import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '@/database/entities';
import {
  CreateTeamDto,
  UpdateTeamDto,
  ListTeamsQueryDto,
} from '@/teams/dto';
import { ResourceNotFoundException } from '@/common/exceptions';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
  ) {}

  async createTeam(createTeamDto: CreateTeamDto) {
    const team = this.teamRepository.create(createTeamDto);
    return this.teamRepository.save(team);
  }

  async getTeam(id: string) {
    const team = await this.teamRepository.findOne({ where: { id } });
    if (!team) {
      throw new ResourceNotFoundException('Team', id);
    }
    return team;
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

    let qb = this.teamRepository.createQueryBuilder('team');

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
      data: teams,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateTeam(id: string, updateTeamDto: UpdateTeamDto) {
    const team = await this.getTeam(id);
    Object.assign(team, updateTeamDto);
    return this.teamRepository.save(team);
  }

  async deleteTeam(id: string) {
    const team = await this.getTeam(id);
    return this.teamRepository.softRemove(team);
  }
}
