import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Account,
  RescueRequest,
  RescueAssignment,
  RescueSupplyOrder,
  Team,
  TeamMember,
  TeamReview,
} from '@/database/entities';
import { RescueService } from '@/rescue/services';
import { RescueController, TeamAssignmentController } from '@/rescue/controllers';
import { FilesModule } from '@/files/files.module';
import { WarehouseModule } from '@/warehouse/warehouse.module';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      RescueRequest,
      RescueAssignment,
      RescueSupplyOrder,
      Team,
      TeamMember,
      TeamReview,
    ]),
    FilesModule,
    WarehouseModule,
    CommonModule,
  ],
  providers: [RescueService],
  controllers: [RescueController, TeamAssignmentController],
  exports: [RescueService],
})
export class RescueModule {}
