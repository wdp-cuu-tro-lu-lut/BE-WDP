import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { WarehouseReceiptItem } from './warehouse-receipt-item.entity';
import { AllocationItem } from './allocation-item.entity';
import { Category } from './category.entity';

export enum ItemCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

@Entity('warehouse_stocks')
@Unique('unique_category_condition', ['categoryId', 'condition'])
@Index(['categoryId'])
export class WarehouseStock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

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
