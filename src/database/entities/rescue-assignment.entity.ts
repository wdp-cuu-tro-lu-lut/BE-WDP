import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { RescueRequest } from './rescue-request.entity';
import { Team } from './team.entity';

export enum AssignmentStatus {
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELED = 'CANCELED',
}

@Entity('rescue_assignments')
@Unique('unique_request_team', ['rescueRequestId', 'teamId'])
@Index(['rescueRequestId'])
@Index(['teamId'])
@Index(['status'])
export class RescueAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  rescueRequestId!: string;

  @Column({ type: 'varchar', length: 255 })
  teamId!: string;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.SENT,
  })
  status!: AssignmentStatus;

  @Column({ type: 'datetime', nullable: true })
  respondedAt!: Date;

  @Column({ type: 'text', nullable: true })
  progressNote!: string;

  @Column({ type: 'text', nullable: true })
  incidentNote!: string | null;

  @Column({ type: 'datetime', nullable: true })
  incidentReportedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => RescueRequest, (rr) => rr.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rescueRequestId' })
  rescueRequest!: RescueRequest;

  @ManyToOne(() => Team, (team) => team.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamId' })
  team!: Team;
}
