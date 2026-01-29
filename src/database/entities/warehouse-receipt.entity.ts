import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Donation } from './donation.entity';
import { Account } from './account.entity';
import { WarehouseReceiptItem } from './warehouse-receipt-item.entity';

@Entity('warehouse_receipts')
@Unique('unique_donation_receipt', ['donationId'])
@Index(['donationId'])
@Index(['createdById'])
export class WarehouseReceipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  donationId!: string;

  @Column({ type: 'uuid' })
  createdById!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Donation, (donation) => donation.warehouseReceipts, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'donationId' })
  donation!: Donation;

  @ManyToOne(() => Account, (account) => account.warehouseReceipts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'createdById' })
  createdBy!: Account;

  @OneToMany(() => WarehouseReceiptItem, (wri) => wri.receipt, {
    cascade: true,
  })
  items!: WarehouseReceiptItem[];
}
