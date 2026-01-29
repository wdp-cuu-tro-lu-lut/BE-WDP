import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RescueAssignment } from './rescue-assignment.entity';
import { Allocation } from './allocation.entity';

@Entity('teams')
@Index(['isActive'])
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  area!: string;

  @Column({ type: 'int', default: 0 })
  teamSize!: number;

  @Column({ type: 'uuid', nullable: true })
  accountId?: string; // Liên kết với tài khoản quản lý (đội trưởng)

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => RescueAssignment, (ra) => ra.team)
  assignments!: RescueAssignment[];

  @OneToMany(() => Allocation, (a) => a.team)
  allocations!: Allocation[];
}
