import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { RescueRequest } from './rescue-request.entity';
import { Team } from './team.entity';

export enum TeamReviewOutcome {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('team_reviews')
@Unique('unique_team_review_per_request', ['rescueRequestId', 'teamId', 'reviewerId'])
@Index(['teamId'])
@Index(['rescueRequestId'])
@Index(['reviewerId'])
export class TeamReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  rescueRequestId!: string;

  @Column({ type: 'uuid' })
  teamId!: string;

  @Column({ type: 'uuid' })
  reviewerId!: string;

  @Column({ type: 'int' })
  rating!: number;

  @Column({
    type: 'enum',
    enum: TeamReviewOutcome,
  })
  outcome!: TeamReviewOutcome;

  @Column({ type: 'text', nullable: true, charset: 'utf8mb4' })
  comment!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => RescueRequest, (rescueRequest) => rescueRequest.teamReviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rescueRequestId' })
  rescueRequest!: RescueRequest;

  @ManyToOne(() => Team, (team) => team.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamId' })
  team!: Team;

  @ManyToOne(() => Account, (account) => account.teamReviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reviewerId' })
  reviewer!: Account;
}