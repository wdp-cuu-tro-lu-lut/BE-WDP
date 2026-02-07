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
import { Team } from './team.entity';
import { Account } from './account.entity';
import { Event } from './event.entity';
import { AllocationItem } from './allocation-item.entity';

export enum AllocationStatus {
  CREATED = 'CREATED',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
}

@Entity('allocations')
@Index(['teamId'])
@Index(['createdById'])
@Index(['status'])
export class Allocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  teamId!: string;

  @Column({ type: 'uuid' })
  createdById!: string;

  @Column({ type: 'uuid', nullable: true })
  eventId?: string;

  @Column({
    type: 'enum',
    enum: AllocationStatus,
    default: AllocationStatus.CREATED,
  })
  status!: AllocationStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Team, (team) => team.allocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamId' })
  team!: Team;

  @ManyToOne(() => Account, (account) => account.allocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'createdById' })
  createdBy!: Account;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'eventId' })
  event?: Event;

  @OneToMany(() => AllocationItem, (ai) => ai.allocation, {
    cascade: true,
  })
  items!: AllocationItem[];
}
