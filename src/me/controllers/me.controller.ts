import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@/common';
import { MeService } from '@/me/services';
import { UpdateProfileDto } from '@/me/dto';

@Controller('me')
@ApiTags('Me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user info' })
  async getMe(@CurrentUser() user: any) {
    return this.meService.getMe(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({
    type: UpdateProfileDto,
    examples: {
      example1: {
        value: {
          fullName: 'Nguyễn Văn A',
          address: '123 Đường ABC, Quận 1, TP.HCM',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        description: 'Update all fields',
      },
      example2: {
        value: {
          fullName: 'Updated Name',
        },
        description: 'Update only fullName',
      },
    },
  })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.meService.updateProfile(user.id, updateProfileDto);
  }
}
