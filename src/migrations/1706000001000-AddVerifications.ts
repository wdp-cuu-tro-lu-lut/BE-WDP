import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerifications1706000001000 implements MigrationInterface {
  name = 'AddVerifications1706000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        id VARCHAR(36) PRIMARY KEY,
        accountId VARCHAR(36) NOT NULL,
        code VARCHAR(10) NOT NULL,
        value VARCHAR(255) NOT NULL,
        type VARCHAR(10) NOT NULL,
        expiresAt BIGINT NOT NULL,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_account_type (accountId, type),
        INDEX idx_code (code),
        CONSTRAINT FK_verifications_account FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS verifications`);
  }
}
