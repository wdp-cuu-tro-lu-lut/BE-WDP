import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { WarehouseReceiptItem } from './warehouse-receipt-item.entity';
import { AllocationItem } from './allocation-item.entity';

export enum ItemCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

@Entity('warehouse_stocks')
@Unique('unique_category_condition', ['category', 'condition'])
@Index(['category'])
export class WarehouseStock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({
    type: 'enum',
    enum: ItemCondition,
  })
  condition!: ItemCondition;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => WarehouseReceiptItem, (wri) => wri.receipt)
  receipts!: WarehouseReceiptItem[];

  @OneToMany(() => AllocationItem, (ai) => ai.allocation)
  allocations!: AllocationItem[];
}
