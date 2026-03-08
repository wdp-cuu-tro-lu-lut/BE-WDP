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
import { Category } from './category.entity';
import { RescueSupplyOrder } from './rescue-supply-order.entity';
import { RescueSupplyItemType } from './rescue-supply-item-type.enum';

@Entity('rescue_supply_order_items')
@Index(['orderId'])
@Index(['categoryId'])
export class RescueSupplyOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  orderId!: string;

  @Column({ type: 'varchar', length: 36 })
  categoryId!: string;

  @Column({
    type: 'enum',
    enum: RescueSupplyItemType,
  })
  itemType!: RescueSupplyItemType;

  @Column({ type: 'int' })
  requestedQuantity!: number;

  @Column({ type: 'int', default: 0 })
  dispatchedQuantity!: number;

  @Column({ type: 'int', default: 0 })
  returnedQuantity!: number;

  @Column({ type: 'int', default: 0 })
  lastShortageQuantity!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => RescueSupplyOrder, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order!: RescueSupplyOrder;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category!: Category;
}