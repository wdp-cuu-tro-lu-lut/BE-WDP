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
import { Account } from './account.entity';

export enum StaffNotificationType {
  PENDING_DONATION_CREATED = 'PENDING_DONATION_CREATED',
  VOLUNTEER_REGISTRATION_CREATED = 'VOLUNTEER_REGISTRATION_CREATED',
  RESCUE_REQUEST_CREATED = 'RESCUE_REQUEST_CREATED',
  REPLENISHMENT_REQUEST_CREATED = 'REPLENISHMENT_REQUEST_CREATED',
  RESCUE_ASSIGNMENT_ACCEPTED = 'RESCUE_ASSIGNMENT_ACCEPTED',
  TEAM_REGISTRATION_REQUEST_CREATED = 'TEAM_REGISTRATION_REQUEST_CREATED',
}

export enum StaffNotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum StaffNotificationCategory {
  PRODUCTS = 'PRODUCTS',
  VOLUNTEERS = 'VOLUNTEERS',
  RESCUE_REQUESTS = 'RESCUE_REQUESTS',
  REPLENISHMENT_REQUESTS = 'REPLENISHMENT_REQUESTS',
  TEAM_REGISTRATION_REQUESTS = 'TEAM_REGISTRATION_REQUESTS',
}

@Entity('staff_notifications')
@Index(['recipientAccountId'])
@Index(['category'])
@Index(['readAt'])
@Index(['createdAt'])
@Index(['recipientAccountId', 'category', 'readAt'])
export class StaffNotification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  recipientAccountId!: string;

  @Column({
    type: 'enum',
    enum: StaffNotificationType,
  })
  type!: StaffNotificationType;

  @Column({
    type: 'enum',
    enum: StaffNotificationCategory,
  })
  category!: StaffNotificationCategory;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({
    type: 'enum',
    enum: StaffNotificationSeverity,
    default: StaffNotificationSeverity.INFO,
  })
  severity!: StaffNotificationSeverity;

  @Column({ type: 'json', nullable: true })
  data!: Record<string, unknown> | null;

  @Column({ type: 'datetime', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Account, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipientAccountId' })
  recipientAccount!: Account;
}