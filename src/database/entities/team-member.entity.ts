import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Team } from './team.entity';
import { Account } from './account.entity';

export enum TeamMemberRole {
  TEAM_LEADER = 'team_leader',
  MEMBER = 'member',
}

export enum TeamMemberStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  INACTIVE = 'inactive',
}

@Entity('team_members')
@Index(['teamId'])
@Index(['accountId'], { unique: true })
@Index(['archivedAccountId'])
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  teamId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  archivedAccountId!: string | null;

  @Column({
    type: 'enum',
    enum: TeamMemberRole,
    default: TeamMemberRole.MEMBER,
  })
  role!: TeamMemberRole;

  @Column({
    type: 'enum',
    enum: TeamMemberStatus,
    default: TeamMemberStatus.ACTIVE,
  })
  status!: TeamMemberStatus;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Team, (team) => team.teamMembers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamId' })
  team!: Team;

  @ManyToOne(() => Account, (account) => account.teamMemberships, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account!: Account;
}