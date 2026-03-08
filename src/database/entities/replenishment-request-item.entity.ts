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
import { ReplenishmentRequest } from './replenishment-request.entity';
import { RescueSupplyItemType } from './rescue-supply-item-type.enum';
import { ItemCondition } from './warehouse-stock.entity';

@Entity('replenishment_request_items')
@Index(['requestId'])
@Index(['categoryId'])
export class ReplenishmentRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  requestId!: string;

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
  approvedQuantity!: number;

  @Column({
    type: 'enum',
    enum: ItemCondition,
    default: ItemCondition.EXCELLENT,
  })
  condition!: ItemCondition;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => ReplenishmentRequest, (request) => request.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requestId' })
  request!: ReplenishmentRequest;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category!: Category;
}