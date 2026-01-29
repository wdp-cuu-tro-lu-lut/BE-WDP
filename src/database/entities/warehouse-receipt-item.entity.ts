import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { WarehouseReceipt } from './warehouse-receipt.entity';

export enum ItemCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

@Entity('warehouse_receipt_items')
@Index(['receiptId'])
export class WarehouseReceiptItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  receiptId!: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({
    type: 'enum',
    enum: ItemCondition,
  })
  condition!: ItemCondition;

  @Column({ type: 'int' })
  quantity!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => WarehouseReceipt, (receipt) => receipt.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receiptId' })
  receipt!: WarehouseReceipt;
}
