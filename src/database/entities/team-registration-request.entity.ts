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
import { Account } from './account.entity';

export enum TeamRegistrationRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

const jsonTransformer = {
  to: (value: unknown[] | null) => (value == null ? null : JSON.stringify(value)),
  from: (value: string | null) => {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as unknown[];
    } catch {
      return null;
    }
  },
};

@Entity('team_registration_requests')
@Index(['requestedById'])
@Index(['status'])
@Index(['reviewedById'])
export class TeamRegistrationRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  requestedById!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true, charset: 'utf8mb4' })
  area!: string | null;

  @Column({ type: 'int', default: 1 })
  teamSize!: number;

  @Column({ type: 'text', nullable: true, charset: 'utf8mb4' })
  baseLocation!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @Column({ type: 'text', nullable: true, charset: 'utf8mb4' })
  description!: string | null;

  @Column({
    type: 'longtext',
    nullable: true,
    transformer: jsonTransformer,
  })
  specialties!: string[] | null;

  @Column({
    type: 'longtext',
    nullable: true,
    transformer: jsonTransformer,
  })
  equipmentList!: Array<{
    equipmentName: string;
    quantity: number;
    status?: string;
  }> | null;

  @Column({
    type: 'longtext',
    nullable: true,
    transformer: jsonTransformer,
  })
  vehicles!: Array<{
    vehicleTypeCode: string;
    plateNumber: string;
    capacity: number;
    status?: string;
  }> | null;

  @Column({
    type: 'enum',
    enum: TeamRegistrationRequestStatus,
    default: TeamRegistrationRequestStatus.PENDING,
  })
  status!: TeamRegistrationRequestStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedById!: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'text', nullable: true, charset: 'utf8mb4' })
  reviewNote!: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvedTeamId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Account, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requestedById' })
  requestedBy!: Account;

  @ManyToOne(() => Account, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy!: Account | null;
}