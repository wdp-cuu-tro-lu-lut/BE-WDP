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

export enum WarehouseReceiptType {
  DONATION = 'DONATION',
  MANUAL = 'MANUAL',
}

@Entity('warehouse_receipts')
@Unique('unique_donation_receipt', ['donationId'])
@Index(['donationId'])
@Index(['createdById'])
@Index(['receiptType'])
export class WarehouseReceipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  donationId!: string | null;

  @Column({
    type: 'enum',
    enum: WarehouseReceiptType,
    default: WarehouseReceiptType.DONATION,
  })
  receiptType!: WarehouseReceiptType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceCode!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 255 })
  createdById!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Donation, (donation) => donation.warehouseReceipts, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'donationId' })
  donation!: Donation | null;

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
