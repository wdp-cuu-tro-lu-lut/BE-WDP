import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common';
import { AccountRole } from '@/database/entities';
import { AccountsService } from '@/accounts/services';
import { FilesService } from '@/files/services';
import {
  CreateAccountDto,
  UpdateAccountDto,
  UpdateAccountStatusDto,
  ListAccountsQueryDto,
} from '@/accounts/dto';
import { StartVerificationDto, ConfirmVerificationDto } from '@/accounts/dto/verification.dto';

@Controller('admin/accounts')
@ApiTags('Admin / Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new account (STAFF or RESCUE_TEAM)' })
  async createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.createAccount(createAccountDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  async getAccount(@Param('id') id: string) {
    return this.accountsService.getAccount(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all accounts with filters' })
  async listAccounts(@Query() query: ListAccountsQueryDto) {
    return this.accountsService.listAccounts(query);
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Update account' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'newemail@example.com' },
        phone: { type: 'string', example: '0909876543' },
        role: {
          type: 'string',
          enum: Object.values(AccountRole),
          example: AccountRole.STAFF,
        },
        fullName: { type: 'string', example: 'Nguyen Van B' },
        address: { type: 'string', example: '789 Duong ABC, Quan 5, TP.HCM' },
        avatarUrl: {
          type: 'string',
          example: 'https://example.com/new-avatar.jpg',
          description: 'Avatar URL fallback when no file is uploaded',
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file. Uploaded files are stored under b2b/wdp/avt',
        },
      },
    },
  })
  async updateAccount(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const uploadedAvatar = avatar
      ? await this.filesService.uploadImage(avatar, 'wdp/avt')
      : undefined;

    return this.accountsService.updateAccount(id, {
      ...updateAccountDto,
      avatarUrl: uploadedAvatar?.url ?? updateAccountDto.avatarUrl,
    });
  }

  @Post(':id/verify-contact')
  @ApiOperation({ summary: 'Start email/phone verification for account contact change' })
  async startContactVerification(@Param('id') id: string, @Body() dto: StartVerificationDto) {
    return this.accountsService.startContactVerification(id, dto.type, dto.value);
  }

  @Post(':id/confirm-contact')
  @ApiOperation({ summary: 'Confirm verification code and apply contact change' })
  async confirmContactVerification(@Param('id') id: string, @Body() dto: ConfirmVerificationDto) {
    return this.accountsService.confirmContactVerification(id, dto.code);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update account status (active/inactive)' })
  async updateAccountStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateAccountStatusDto,
  ) {
    return this.accountsService.updateAccountStatus(id, statusDto);
  }
}
