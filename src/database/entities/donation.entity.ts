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
import { Event } from './event.entity';
import { DonationItem } from './donation-item.entity';
import { WarehouseReceipt } from './warehouse-receipt.entity';

export enum DonationStatus {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RECEIVED = 'RECEIVED',
  ALLOCATED = 'ALLOCATED',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
}

@Entity('donations')
@Index(['creatorId'])
@Index(['eventId'])
@Index(['status'])
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  creatorId!: string;

  @Column({ type: 'uuid' })
  eventId!: string;

  @Column({
    type: 'enum',
    enum: DonationStatus,
    default: DonationStatus.SUBMITTED,
  })
  status!: DonationStatus;

  @Column({ type: 'text', nullable: true })
  note!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Account, (account) => account.donations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creatorId' })
  creator!: Account;

  @ManyToOne(() => Event, (event) => event.donations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event!: Event;

  @OneToMany(() => DonationItem, (di) => di.donation, { cascade: true })
  items!: DonationItem[];

  @OneToMany(() => WarehouseReceipt, (wr) => wr.donation)
  warehouseReceipts!: WarehouseReceipt[];
}
