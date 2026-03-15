import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Account } from './account.entity';

export type VerificationType = 'email' | 'phone';

@Entity('verifications')
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  accountId!: string;

  @ManyToOne(() => Account, (account) => account.id, { onDelete: 'CASCADE' })
  account!: Account;

  @Column({ type: 'varchar', length: 10 })
  code!: string;

  @Column({ type: 'varchar', length: 10 })
  value!: string; // new email or phone

  @Column({ type: 'varchar', length: 10 })
  type!: VerificationType;

  @Column({ type: 'bigint' })
  expiresAt!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
