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

export enum TeamEquipmentStatus {
  READY = 'ready',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
}

@Entity('team_equipment')
@Index(['teamId'])
@Index(['status'])
export class TeamEquipment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  teamId!: string;

  @Column({ type: 'varchar', length: 255 })
  equipmentName!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({
    type: 'enum',
    enum: TeamEquipmentStatus,
    default: TeamEquipmentStatus.READY,
  })
  status!: TeamEquipmentStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Team, (team) => team.equipment, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamId' })
  team!: Team;
}