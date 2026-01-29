import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Account, RefreshToken, Profile } from '@/database/entities';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
} from '@/auth/dto';
import {
  ConflictException,
  UnauthorizedException,
  ResourceNotFoundException,
} from '@/common/exceptions';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, phone, password, fullName, address, avatarUrl } =
      registerDto;

    // Validate email or phone is provided
    if (!email && !phone) {
      throw new ConflictException(
        'Either email or phone must be provided',
      );
    }

    // Check if email/phone already exists
    if (email) {
      const existingEmail = await this.accountRepository.findOne({
        where: { email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    if (phone) {
      const existingPhone = await this.accountRepository.findOne({
        where: { phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone already registered');
      }
    }

    // Create account
    const passwordHash = await bcrypt.hash(password, 10);
    const account = new Account();
    account.email = email || undefined;
    account.phone = phone || undefined;
    account.passwordHash = passwordHash;

    const savedAccount = await this.accountRepository.save(account);

    // Create profile
    const profile = new Profile();
    profile.accountId = savedAccount.id!;
    profile.fullName = fullName!;
    profile.address = address;
    profile.avatarUrl = avatarUrl;
    await this.profileRepository.save(profile);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(savedAccount);

    return {
      accessToken,
      refreshToken,
      account: {
        id: savedAccount.id,
        email: savedAccount.email,
        phone: savedAccount.phone,
        role: savedAccount.role,
      },
      profile: {
        fullName: profile.fullName,
        address: profile.address,
        avatarUrl: profile.avatarUrl,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    let account: Account | null;

    if (email) {
      account = await this.accountRepository.findOne({
        where: { email },
      });
    } else {
      throw new UnauthorizedException('Email or phone required');
    }

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, account.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!account.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const { accessToken, refreshToken } = await this.generateTokens(account);

    return {
      accessToken,
      refreshToken,
      account: {
        id: account.id,
        email: account.email,
        phone: account.phone,
        role: account.role,
      },
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const decoded = this.jwtService.verify(refreshToken, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });

    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: {
        id: decoded.tokenId,
        accountId: decoded.sub,
        revokedAt: IsNull(),
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const account = await this.accountRepository.findOne({
      where: { id: decoded.sub },
    });

    if (!account || !account.isActive) {
      throw new UnauthorizedException('Account not found or disabled');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens(account);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(logoutDto: LogoutDto) {
    const { refreshToken } = logoutDto;

    const decoded = this.jwtService.verify(refreshToken, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });

    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { id: decoded.tokenId },
    });

    if (tokenRecord) {
      tokenRecord.revokedAt = new Date();
      await this.refreshTokenRepository.save(tokenRecord);
    }
  }

  private async generateTokens(account: Account) {
    const payload = {
      sub: account.id,
      email: account.email,
      phone: account.phone,
      role: account.role,
    };

    const jwtExpiration = this.configService.get('JWT_EXPIRATION') || '3600';
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: `${jwtExpiration}s`,
    });

    const refreshTokenId = uuidv4();
    const refreshTokenPayload = {
      ...payload,
      tokenId: refreshTokenId,
    };

    const jwtRefreshExpiration = this.configService.get('JWT_REFRESH_EXPIRATION') || '604800';
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: `${jwtRefreshExpiration}s`,
    });

    const expiresAt = new Date(
      Date.now() + (parseInt(jwtRefreshExpiration, 10)) * 1000,
    );

    const tokenRecord = new RefreshToken();
    tokenRecord.id = refreshTokenId;
    tokenRecord.accountId = account.id;
    tokenRecord.tokenHash = await bcrypt.hash(refreshToken, 10);
    tokenRecord.expiresAt = expiresAt;

    await this.refreshTokenRepository.save(tokenRecord);

    return { accessToken, refreshToken };
  }
}
