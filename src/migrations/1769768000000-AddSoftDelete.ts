import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDelete1769768000000 implements MigrationInterface {
  name = 'AddSoftDelete1769768000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`categories\` ADD \`deletedAt\` datetime(6) NULL`);
    await queryRunner.query(`ALTER TABLE \`teams\` ADD \`deletedAt\` datetime(6) NULL`);
    await queryRunner.query(`ALTER TABLE \`events\` ADD \`deletedAt\` datetime(6) NULL`);
    await queryRunner.query(`ALTER TABLE \`accounts\` ADD \`deletedAt\` datetime(6) NULL`);
    await queryRunner.query(`ALTER TABLE \`donations\` ADD \`deletedAt\` datetime(6) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`donations\` DROP COLUMN \`deletedAt\``);
    await queryRunner.query(`ALTER TABLE \`accounts\` DROP COLUMN \`deletedAt\``);
    await queryRunner.query(`ALTER TABLE \`events\` DROP COLUMN \`deletedAt\``);
    await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`deletedAt\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`deletedAt\``);
  }
}
