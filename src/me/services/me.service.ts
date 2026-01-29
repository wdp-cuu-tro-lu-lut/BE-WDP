import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, Profile } from '@/database/entities';
import { UpdateProfileDto } from '@/me/dto';
import { ResourceNotFoundException } from '@/common/exceptions';

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async getMe(accountId: string) {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: ['profile'],
    });

    if (!account) {
      throw new ResourceNotFoundException('Account', accountId);
    }

    return {
      id: account.id,
      email: account.email,
      phone: account.phone,
      role: account.role,
      isActive: account.isActive,
      profile: account.profile,
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

    return {
      id: account.id,
      email: account.email,
      phone: account.phone,
      role: account.role,
      profile: updated,
    };
  }
}
