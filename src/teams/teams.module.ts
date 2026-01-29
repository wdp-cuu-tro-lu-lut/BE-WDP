import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '@/database/entities';
import { TeamsService } from '@/teams/services';
import { TeamsController } from '@/teams/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Team])],
  providers: [TeamsService],
  controllers: [TeamsController],
  exports: [TeamsService],
})
export class TeamsModule {}
