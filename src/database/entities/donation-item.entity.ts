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
import { Donation } from './donation.entity';
import { DonationStatus } from './donation-status.enum';
import { Category } from './category.entity';

export enum ItemCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

@Entity('donation_items')
@Index(['donationId'])
export class DonationItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  donationId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  categoryId!: string;

  @Column({ type: 'text', nullable: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  unit!: string;

  @Column({ type: 'timestamp', nullable: true })
  expirationDate!: Date;

  @Column({
    type: 'enum',
    enum: DonationStatus,
    default: DonationStatus.SUBMITTED,
  })
  status!: DonationStatus;

  @ManyToOne(() => Category, (category) => category.items)
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    type: 'enum',
    enum: ItemCondition,
    default: ItemCondition.GOOD,
  })
  condition!: ItemCondition;

  @Column({ type: 'json', nullable: true })
  imageUrls!: string[];

  @Column({ type: 'text', nullable: true })
  note!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Donation, (donation) => donation.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'donationId' })
  donation!: Donation;
}
