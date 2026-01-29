import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescueRequest, RescueAssignment, Team } from '@/database/entities';
import { RescueService } from '@/rescue/services';
import { RescueController, TeamAssignmentController } from '@/rescue/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([RescueRequest, RescueAssignment, Team])],
  providers: [RescueService],
  controllers: [RescueController, TeamAssignmentController],
  exports: [RescueService],
})
export class RescueModule {}
