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
import { RescueSupplyOrder } from './rescue-supply-order.entity';
import { Account } from './account.entity';
import { ReplenishmentRequestItem } from './replenishment-request-item.entity';

export enum ReplenishmentRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('replenishment_requests')
@Index(['orderId'])
@Index(['createdById'])
@Index(['reviewedById'])
@Index(['status'])
export class ReplenishmentRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  orderId!: string;

  @Column({ type: 'varchar', length: 36 })
  createdById!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reviewedById!: string | null;

  @Column({
    type: 'enum',
    enum: ReplenishmentRequestStatus,
    default: ReplenishmentRequestStatus.PENDING,
  })
  status!: ReplenishmentRequestStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'text', nullable: true })
  decisionNote!: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => RescueSupplyOrder, (order) => order.replenishmentRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order!: RescueSupplyOrder;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: Account;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy!: Account | null;

  @OneToMany(() => ReplenishmentRequestItem, (item) => item.request, {
    cascade: true,
  })
  items!: ReplenishmentRequestItem[];
}