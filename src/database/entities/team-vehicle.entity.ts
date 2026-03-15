import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Team } from './team.entity';
import { VehicleType } from './vehicle-type.entity';

export enum TeamVehicleStatus {
  READY = 'ready',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
}

@Entity('team_vehicles')
@Index(['teamId'])
@Index(['plateNumber'], { unique: true })
@Index(['status'])
export class TeamVehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  teamId!: string;

  @Column({ type: 'varchar', length: 255 })
  vehicleTypeId!: string;

  @Column({ type: 'varchar', length: 50 })
  plateNumber!: string;

  @Column({ type: 'int', default: 0 })
  capacity!: number;

  @Column({
    type: 'enum',
    enum: TeamVehicleStatus,
    default: TeamVehicleStatus.READY,
  })
  status!: TeamVehicleStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Team, (team) => team.vehicles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamId' })
  team!: Team;

  @ManyToOne(() => VehicleType, (vehicleType) => vehicleType.teamVehicles, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'vehicleTypeId' })
  vehicleType!: VehicleType;
}