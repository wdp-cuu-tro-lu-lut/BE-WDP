import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { RescueAssignment } from './rescue-assignment.entity';

export enum RescueStatus {
  NEW = 'NEW',
  REVIEWED = 'REVIEWED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
  REJECTED = 'REJECTED',
}

export enum RescuePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('rescue_requests')
@Index(['creatorId'])
@Index(['status'])
@Index(['priority'])
export class RescueRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  creatorId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  guestName!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  guestPhone!: string | null;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number;

  @Column({
    type: 'enum',
    enum: RescuePriority,
    default: RescuePriority.MEDIUM,
  })
  priority!: RescuePriority;

  @Column({
    type: 'enum',
    enum: RescueStatus,
    default: RescueStatus.NEW,
  })
  status!: RescueStatus;

  @Column({ type: 'text', nullable: true })
  note!: string;

  @Column({ type: 'simple-json', nullable: true })
  evidenceImages!: string[] | null;

  @Column({ type: 'int', default: 1 })
  requiredTeams!: number;

  @Column({ type: 'int', nullable: true })
  estimatedPeople!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Account, (account) => account.rescueRequests, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'creatorId' })
  creator!: Account | null;

  @OneToMany(() => RescueAssignment, (ra) => ra.rescueRequest, {
    cascade: true,
  })
  assignments!: RescueAssignment[];
}
