import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { RescueRequest, RescuePriority } from './rescue-request.entity';
import { Account } from './account.entity';
import { RescueSupplyOrderItem } from './rescue-supply-order-item.entity';
import { ReplenishmentRequest } from './replenishment-request.entity';

export enum RescueSupplyOrderStatus {
  PLANNED = 'PLANNED',
  INSUFFICIENT = 'INSUFFICIENT',
  READY = 'READY',
  DISPATCHED = 'DISPATCHED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

@Entity('rescue_supply_orders')
@Unique('unique_rescue_supply_order_request', ['rescueRequestId'])
@Index(['rescueRequestId'])
@Index(['createdById'])
@Index(['status'])
export class RescueSupplyOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  rescueRequestId!: string;

  @Column({ type: 'varchar', length: 36 })
  createdById!: string;

  @Column({ type: 'int' })
  estimatedPeople!: number;

  @Column({
    type: 'enum',
    enum: RescuePriority,
  })
  priority!: RescuePriority;

  @Column({ type: 'int', default: 0 })
  totalRescuers!: number;

  @Column({
    type: 'enum',
    enum: RescueSupplyOrderStatus,
    default: RescueSupplyOrderStatus.PLANNED,
  })
  status!: RescueSupplyOrderStatus;

  @Column({ type: 'datetime', nullable: true })
  lastStockCheckAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  dispatchedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => RescueRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rescueRequestId' })
  rescueRequest!: RescueRequest;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: Account;

  @OneToMany(() => RescueSupplyOrderItem, (item) => item.order, {
    cascade: true,
  })
  items!: RescueSupplyOrderItem[];

  @OneToMany(() => ReplenishmentRequest, (request) => request.order)
  replenishmentRequests!: ReplenishmentRequest[];
}