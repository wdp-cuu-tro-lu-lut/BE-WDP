import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { Event } from './event.entity';

@Entity('volunteer_registrations')
@Unique('unique_event_user', ['eventId', 'accountId'])
@Index(['eventId'])
@Index(['accountId'])
export class VolunteerRegistration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  eventId!: string;

  @Column({ type: 'varchar', length: 255 })
  accountId!: string;

  @Column({ type: 'text', nullable: true })
  note!: string;

  @CreateDateColumn()
  registeredAt!: Date;

  @ManyToOne(() => Event, (event) => event.volunteerRegistrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event!: Event;

  @ManyToOne(() => Account, (account) => account.volunteerRegistrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account!: Account;
}
