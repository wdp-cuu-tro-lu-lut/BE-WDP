import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescueRequest, RescueAssignment, Team } from '@/database/entities';
import { RescueService } from '@/rescue/services';
import { RescueController, TeamAssignmentController } from '@/rescue/controllers';
import { FilesModule } from '@/files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RescueRequest, RescueAssignment, Team]),
    FilesModule,
  ],
  providers: [RescueService],
  controllers: [RescueController, TeamAssignmentController],
  exports: [RescueService],
})
export class RescueModule {}
