import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, Profile, Team, TeamMember } from '@/database/entities';
import { MeService } from '@/me/services';
import { MeController } from '@/me/controllers';
import { FilesModule } from '@/files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Profile, Team, TeamMember]), FilesModule],
  providers: [MeService],
  controllers: [MeController],
})
export class MeModule {}
