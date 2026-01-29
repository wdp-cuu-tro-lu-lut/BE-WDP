import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Account, Profile, AccountRole } from '@/database/entities';
import {
  CreateAccountDto,
  UpdateAccountDto,
  UpdateAccountStatusDto,
  ListAccountsQueryDto,
} from '@/accounts/dto';
import {
  ConflictException,
  ResourceNotFoundException,
} from '@/common/exceptions';
import { NotificationService } from '@/common/services/notification.service';
import { Verification } from '@/database/entities/verification.entity';
import { LessThan } from 'typeorm';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Verification)
    private verificationRepository: Repository<Verification>,
    private notificationService: NotificationService,
  ) {}

  async createAccount(createAccountDto: CreateAccountDto) {
    const { email, phone, password, role, fullName, address, avatarUrl } =
      createAccountDto;

    if (!email && !phone) {
      throw new ConflictException('Either email or phone must be provided');
    }

    if (email) {
      const existing = await this.accountRepository.findOne({
        where: { email },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    if (phone) {
      const existing = await this.accountRepository.findOne({
        where: { phone },
      });
      if (existing) {
        throw new ConflictException('Phone already exists');
      }
    }

    // Coerce numeric passwords (e.g. 123456) into strings and validate
    if (password === undefined || password === null) {
      throw new BadRequestException('Password is required');
    }

    const passwordStr = typeof password === 'string' ? password : String(password);
    if (passwordStr.trim() === '') {
      throw new BadRequestException('Password is required');
    }

    const passwordHash = await bcrypt.hash(passwordStr, 10);
    const account = new Account();
    account.email = email || undefined;
    account.phone = phone || undefined;
    account.passwordHash = passwordHash;
    account.role = role;

    const savedAccount = await this.accountRepository.save(account);

    const profile = new Profile();
    profile.accountId = savedAccount.id!;
    profile.fullName = fullName!;
    profile.address = address;
    profile.avatarUrl = avatarUrl;
    await this.profileRepository.save(profile);

    return this.getAccount(savedAccount.id);
  }

  async getAccount(id: string) {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!account) {
      throw new ResourceNotFoundException('Account', id);
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

  async listAccounts(query: ListAccountsQueryDto) {
    const {
      role,
      q,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'DESC',
    } = query;

    let qb = this.accountRepository.createQueryBuilder('account').leftJoinAndSelect('account.profile', 'profile');

    if (role) {
      qb = qb.where('account.role = :role', { role });
    }

    if (q) {
      qb = qb.andWhere(
        '(account.email LIKE :q OR account.phone LIKE :q OR profile.fullName LIKE :q)',
        { q: `%${q}%` },
      );
    }

    if (isActive !== undefined) {
      qb = qb.andWhere('account.isActive = :isActive', { isActive });
    }

    const total = await qb.getCount();

    const skip = (page - 1) * limit;
    const accounts = await qb
      .orderBy(`account.${sortBy}`, order)
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: accounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        phone: acc.phone,
        role: acc.role,
        isActive: acc.isActive,
        profile: acc.profile,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateAccount(id: string, updateAccountDto: UpdateAccountDto) {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!account) {
      throw new ResourceNotFoundException('Account', id);
    }

    // Do not allow direct change of email/phone — require verification flow first
    if (updateAccountDto.email && updateAccountDto.email !== account.email) {
      throw new BadRequestException(
        'Changing email requires verification. Start a verification request before updating.',
      );
    }

    if (updateAccountDto.phone && updateAccountDto.phone !== account.phone) {
      throw new BadRequestException(
        'Changing phone requires verification. Start a verification request before updating.',
      );
    }

    const { email, phone, role } = updateAccountDto;
    if (email !== undefined) account.email = email;
    if (phone !== undefined) account.phone = phone;
    if (role !== undefined) account.role = role;

    await this.accountRepository.save(account);

    if (account.profile) {
      const { fullName, address, avatarUrl } = updateAccountDto;
      if (fullName !== undefined) account.profile.fullName = fullName;
      if (address !== undefined) account.profile.address = address;
      if (avatarUrl !== undefined) account.profile.avatarUrl = avatarUrl;
      await this.profileRepository.save(account.profile);
    }

    return this.getAccount(id);
  }

  // Start contact change verification: issues a code and sends via email or SMS
  async startContactVerification(id: string, type: 'email' | 'phone', value: string) {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) throw new ResourceNotFoundException('Account', id);

    // ensure value is not already used by other account
    if (type === 'email') {
      const existing = await this.accountRepository.findOne({ where: { email: value } });
      if (existing) throw new ConflictException('Email already exists');
    } else {
      const existing = await this.accountRepository.findOne({ where: { phone: value } });
      if (existing) throw new ConflictException('Phone already exists');
    }

    // remove old pending verifications for same account/type
    await this.verificationRepository.delete({ accountId: id, type });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 1000 * 60 * 15; // 15 minutes

    const v = new Verification();
    v.accountId = id;
    v.code = code;
    v.value = value;
    v.type = type;
    v.expiresAt = expiresAt;

    await this.verificationRepository.save(v);

    // send
    if (type === 'email') {
      await this.notificationService.sendEmail(value, 'Verify your email', `Your verification code is ${code}`);
    } else {
      await this.notificationService.sendSms(value, `Your verification code is ${code}`);
    }

    return { ok: true, expiresAt };
  }

  // Confirm verification code and finalize contact change
  async confirmContactVerification(id: string, code: string) {
    const v = await this.verificationRepository.findOne({ where: { accountId: id, code } });
    if (!v) throw new ConflictException('Invalid or expired verification code');
    if (v.expiresAt < Date.now()) {
      await this.verificationRepository.delete(v.id);
      throw new ConflictException('Verification code expired');
    }

    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) throw new ResourceNotFoundException('Account', id);

    if (v.type === 'email') {
      account.email = v.value;
    } else {
      account.phone = v.value;
    }

    await this.accountRepository.save(account);
    await this.verificationRepository.delete(v.id);

    return this.getAccount(id);
  }

  async updateAccountStatus(id: string, statusDto: UpdateAccountStatusDto) {
    const account = await this.accountRepository.findOne({
      where: { id },
    });

    if (!account) {
      throw new ResourceNotFoundException('Account', id);
    }

    account.isActive = statusDto.isActive;
    await this.accountRepository.save(account);

    return this.getAccount(id);
  }
}
