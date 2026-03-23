import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { RescueSupplyItemType } from './rescue-supply-item-type.enum';
import { RescueSupplyOrderItem } from './rescue-supply-order-item.entity';
import { RescueSupplyTeamHandoff } from './rescue-supply-team-handoff.entity';

@Entity('rescue_supply_team_handoff_items')
@Index(['handoffId'])
@Index(['orderItemId'])
@Index(['categoryId'])
export class RescueSupplyTeamHandoffItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  handoffId!: string;

  @Column({ type: 'varchar', length: 36 })
  orderItemId!: string;

  @Column({ type: 'varchar', length: 36 })
  categoryId!: string;

  @Column({
    type: 'enum',
    enum: RescueSupplyItemType,
  })
  itemType!: RescueSupplyItemType;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int', default: 0 })
  returnedQuantity!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => RescueSupplyTeamHandoff, (handoff) => handoff.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'handoffId' })
  handoff!: RescueSupplyTeamHandoff;

  @ManyToOne(() => RescueSupplyOrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderItemId' })
  orderItem!: RescueSupplyOrderItem;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category!: Category;
}