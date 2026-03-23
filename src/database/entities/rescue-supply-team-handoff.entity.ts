import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { RescueAssignment } from './rescue-assignment.entity';
import { RescueSupplyOrder } from './rescue-supply-order.entity';
import { RescueSupplyTeamHandoffItem } from './rescue-supply-team-handoff-item.entity';
import { Team } from './team.entity';

export enum RescueSupplyTeamHandoffStatus {
  PENDING_RECEIPT = 'PENDING_RECEIPT',
  RECEIVED = 'RECEIVED',
  CANCELED = 'CANCELED',
}

@Entity('rescue_supply_team_handoffs')
@Index(['orderId'])
@Index(['assignmentId'])
@Index(['teamId'])
@Index(['status'])
export class RescueSupplyTeamHandoff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  orderId!: string;

  @Column({ type: 'varchar', length: 255 })
  assignmentId!: string;

  @Column({ type: 'varchar', length: 255 })
  teamId!: string;

  @Column({ type: 'varchar', length: 36 })
  dispatchedById!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  receivedById!: string | null;

  @Column({
    type: 'enum',
    enum: RescueSupplyTeamHandoffStatus,
    default: RescueSupplyTeamHandoffStatus.PENDING_RECEIPT,
  })
  status!: RescueSupplyTeamHandoffStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'datetime' })
  dispatchedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  receivedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => RescueSupplyOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: RescueSupplyOrder;

  @ManyToOne(() => RescueAssignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment!: RescueAssignment;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team!: Team;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dispatchedById' })
  dispatchedBy!: Account;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'receivedById' })
  receivedBy!: Account | null;

  @OneToMany(() => RescueSupplyTeamHandoffItem, (item) => item.handoff, {
    cascade: true,
  })
  items!: RescueSupplyTeamHandoffItem[];
}