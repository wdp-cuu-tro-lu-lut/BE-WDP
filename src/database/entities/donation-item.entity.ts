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

  @Column({ type: 'uuid' })
  donationId!: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

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
