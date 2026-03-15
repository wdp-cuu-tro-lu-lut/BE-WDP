import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { Event } from './event.entity';
import { DonationItem } from './donation-item.entity';
import { WarehouseReceipt } from './warehouse-receipt.entity';

import { DonationStatus } from './donation-status.enum';

@Entity('donations')
@Index(['creatorId'])
@Index(['eventId'])
@Index(['status'])
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  creatorId!: string;

  @Column({ type: 'varchar', length: 255 })
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

  @DeleteDateColumn()
  deletedAt?: Date;

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
