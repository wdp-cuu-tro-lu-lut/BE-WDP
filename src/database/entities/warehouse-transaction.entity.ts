import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Category } from './category.entity';
import { Account } from './account.entity';

export enum WarehouseTransactionType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum WarehouseTransactionSource {
  DONATION_RECEIPT = 'DONATION_RECEIPT',
  MANUAL_STOCK_ENTRY = 'MANUAL_STOCK_ENTRY',
  ALLOCATION_DISPATCH = 'ALLOCATION_DISPATCH',
  RESCUE_DISPATCH = 'RESCUE_DISPATCH',
  RESCUE_RETURN = 'RESCUE_RETURN',
  MANUAL_REPLENISHMENT = 'MANUAL_REPLENISHMENT',
}

@Entity('warehouse_transactions')
@Index(['categoryId'])
@Index(['performedById'])
@Index(['source'])
@Index(['type'])
@Index(['referenceId'])
export class WarehouseTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  categoryId!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  performedById!: string | null;

  @Column({
    type: 'enum',
    enum: WarehouseTransactionType,
  })
  type!: WarehouseTransactionType;

  @Column({
    type: 'enum',
    enum: WarehouseTransactionSource,
  })
  source!: WarehouseTransactionSource;

  @Column({ type: 'varchar', length: 36 })
  referenceId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int' })
  balanceBefore!: number;

  @Column({ type: 'int' })
  balanceAfter!: number;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performedById' })
  performedBy!: Account | null;
}