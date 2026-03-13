import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Account,
  Allocation,
  Profile,
  RescueAssignment,
  Team,
  TeamEquipment,
  TeamMember,
  TeamRegistrationRequest,
  TeamSpecialty,
  TeamVehicle,
  VehicleType,
} from '@/database/entities';
import { TeamsService } from '@/teams/services';
import {
  TeamRegistrationRequestsController,
  TeamSelfController,
  TeamsController,
} from '@/teams/controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      Account,
      Profile,
      RescueAssignment,
      Allocation,
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
