import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RescueAssignment } from './rescue-assignment.entity';
import { Allocation } from './allocation.entity';
import { Account } from './account.entity';
import { TeamEquipment } from './team-equipment.entity';
import { TeamMember } from './team-member.entity';
import { TeamReview } from './team-review.entity';
import { TeamSpecialty } from './team-specialty.entity';
import { TeamVehicle } from './team-vehicle.entity';

@Entity('teams')
@Index(['isActive'])
@Index(['accountId'], { unique: true })
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  area!: string;

  @Column({ type: 'int', default: 0 })
  teamSize!: number;

  @Column({ type: 'text', nullable: true })
  baseLocation!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountId!: string | null; // Liên kết với tài khoản quản lý (đội trưởng)

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'accountId' })
  account?: Account;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
  @DeleteDateColumn()
  deletedAt?: Date;
  @OneToMany(() => RescueAssignment, (ra) => ra.team)
  assignments!: RescueAssignment[];

  @OneToMany(() => Allocation, (a) => a.team)
  allocations!: Allocation[];

  @OneToMany(() => TeamSpecialty, (specialty) => specialty.team, {
    cascade: true,
  })
  specialties!: TeamSpecialty[];

  @OneToMany(() => TeamEquipment, (equipment) => equipment.team, {
    cascade: true,
  })
  equipment!: TeamEquipment[];

  @OneToMany(() => TeamVehicle, (vehicle) => vehicle.team, {
    cascade: true,
  })
  vehicles!: TeamVehicle[];

  @OneToMany(() => TeamMember, (teamMember) => teamMember.team)
  teamMembers!: TeamMember[];

  @OneToMany(() => TeamReview, (teamReview) => teamReview.team)
  reviews!: TeamReview[];
}
