import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Profile } from './profile.entity';
import { RefreshToken } from './refresh-token.entity';
import { RescueRequest } from './rescue-request.entity';
import { RescueAssignment } from './rescue-assignment.entity';
import { VolunteerRegistration } from './volunteer-registration.entity';
import { Donation } from './donation.entity';
import { WarehouseReceipt } from './warehouse-receipt.entity';
import { Allocation } from './allocation.entity';

export enum AccountRole {
  USER = 'USER',
  RESCUE_TEAM = 'RESCUE_TEAM',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

@Entity('accounts')
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: AccountRole,
    default: AccountRole.USER,
  })
  role!: AccountRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToOne(() => Profile, (profile) => profile.account, {
    cascade: true,
    eager: true,
  })
  profile!: Profile;

  @OneToMany(() => RefreshToken, (rt) => rt.account, { cascade: true })
  refreshTokens!: RefreshToken[];

  @OneToMany(() => RescueRequest, (rr) => rr.creator)
  rescueRequests!: RescueRequest[];

  @OneToMany(() => VolunteerRegistration, (vr) => vr.account)
  volunteerRegistrations!: VolunteerRegistration[];

  @OneToMany(() => Donation, (d) => d.creator)
  donations!: Donation[];

  @OneToMany(() => WarehouseReceipt, (wr) => wr.createdBy)
  warehouseReceipts!: WarehouseReceipt[];

  @OneToMany(() => Allocation, (a) => a.createdBy)
  allocations!: Allocation[];
}
