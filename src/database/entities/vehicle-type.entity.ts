import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { TeamVehicle } from './team-vehicle.entity';

@Entity('vehicle_types')
@Index(['code'], { unique: true })
@Index(['isActive'])
export class VehicleType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'varchar', length: 150, charset: 'utf8mb4' })
  name!: string;

  @Column({ type: 'text', nullable: true, charset: 'utf8mb4' })
  description!: string | null;

  @Column({ type: 'int', default: 0 })
  defaultCapacity!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => TeamVehicle, (teamVehicle) => teamVehicle.vehicleType)
  teamVehicles!: TeamVehicle[];
}