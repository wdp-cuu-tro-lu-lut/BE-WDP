import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '@/common/common.module';
import {
  Account,
  Allocation,
  Profile,
  RescueAssignment,
  RescueSupplyTeamHandoffItem,
  Team,
  TeamEquipment,
  TeamMember,
  TeamRegistrationRequest,
  TeamSpecialty,
  TeamVehicle,
  VehicleType,
} from '@/database/entities';
import { DashboardModule } from '@/dashboard/dashboard.module';
import { TeamsService } from '@/teams/services';
import {
  TeamRegistrationRequestsController,
  TeamSelfController,
  TeamsController,
} from '@/teams/controllers';

@Module({
  imports: [
    CommonModule,
    DashboardModule,
    TypeOrmModule.forFeature([
      Team,
      Account,
      Profile,
      RescueAssignment,
      Allocation,
      RescueSupplyTeamHandoffItem,
      TeamMember,
      TeamRegistrationRequest,
      TeamSpecialty,
      TeamEquipment,
      TeamVehicle,
      VehicleType,
    ]),
  ],
  providers: [TeamsService],
  controllers: [TeamsController, TeamSelfController, TeamRegistrationRequestsController],
  exports: [TeamsService],
})
export class TeamsModule {}
