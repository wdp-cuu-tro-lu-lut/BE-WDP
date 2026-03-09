import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard, CurrentUser } from '@/common';
import { MeService } from '@/me/services';
import { UpdateProfileDto } from '@/me/dto';
import { FilesService } from '@/files/services';

@Controller('me')
@ApiTags('Me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly filesService: FilesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user info' })
  async getMe(@CurrentUser() user: any) {
    return this.meService.getMe(user.id);
  }

  @Put()
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          example: 'Nguyen Van A',
        },
        address: {
          type: 'string',
          example: '123 Duong ABC, Quan 1, TP.HCM',
        },
        avatarUrl: {
          type: 'string',
          example: 'https://example.com/avatar.jpg',
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
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const uploadedAvatar = avatar
      ? await this.filesService.uploadImage(avatar, 'wdp/avt')
      : undefined;

    return this.meService.updateProfile(user.id, {
      ...updateProfileDto,
      avatarUrl: uploadedAvatar?.url ?? updateProfileDto.avatarUrl,
    });
  }
}
