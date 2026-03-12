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
  TeamSpecialty,
  TeamVehicle,
  VehicleType,
} from '@/database/entities';
import { TeamsService } from '@/teams/services';
import { TeamsController } from '@/teams/controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      Account,
      Profile,
      RescueAssignment,
      Allocation,
      TeamMember,
      TeamSpecialty,
      TeamEquipment,
      TeamVehicle,
      VehicleType,
    ]),
  ],
  providers: [TeamsService],
  controllers: [TeamsController],
  exports: [TeamsService],
})
export class TeamsModule {}
