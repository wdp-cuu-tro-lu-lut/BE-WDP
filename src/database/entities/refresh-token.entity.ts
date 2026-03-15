import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';

@Entity('refresh_tokens')
@Index(['accountId', 'revokedAt'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  accountId!: string;

  @Column({ type: 'text' })
  tokenHash!: string;

  @Column({ type: 'datetime' })
  expiresAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Account, (account) => account.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account!: Account;
}
