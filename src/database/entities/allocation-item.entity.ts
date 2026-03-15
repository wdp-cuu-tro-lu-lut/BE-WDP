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
import { Allocation } from './allocation.entity';

export enum ItemCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

@Entity('allocation_items')
@Index(['allocationId'])
export class AllocationItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  allocationId!: string;

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

  @ManyToOne(() => Allocation, (allocation) => allocation.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'allocationId' })
  allocation!: Allocation;
}
