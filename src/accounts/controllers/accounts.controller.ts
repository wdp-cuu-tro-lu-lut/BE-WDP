import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common';
import { AccountRole } from '@/database/entities';
import { AccountsService } from '@/accounts/services';
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
  constructor(private readonly accountsService: AccountsService) {}

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
  @ApiOperation({ summary: 'Update account' })
  async updateAccount(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountsService.updateAccount(id, updateAccountDto);
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
