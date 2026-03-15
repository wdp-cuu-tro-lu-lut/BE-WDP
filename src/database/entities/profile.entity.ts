import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  accountId!: string;

  @Column({ type: 'varchar', length: 255, charset: 'utf8mb4' })
  fullName!: string;

  @Column({ type: 'text', nullable: true, charset: 'utf8mb4' })
  address?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, charset: 'utf8mb4' })
  avatarUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToOne(() => Account, (account) => account.profile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account!: Account;
}
