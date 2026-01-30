import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { VolunteerRegistration } from './volunteer-registration.entity';
import { Donation } from './donation.entity';

export enum EventType {
  VOLUNTEER = 'VOLUNTEER',
  DONATION = 'DONATION',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELED = 'CANCELED',
}

@Entity('events')
@Index(['status'])
@Index(['type'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  type!: EventType;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status!: EventStatus;

  @Column({ type: 'datetime', nullable: true })
  startDate!: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate!: Date;

  @Column({ type: 'text', nullable: true })
  location!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => VolunteerRegistration, (vr) => vr.event, {
    cascade: true,
  })
  volunteerRegistrations!: VolunteerRegistration[];

  @OneToMany(() => Donation, (d) => d.event)
  donations!: Donation[];
}
