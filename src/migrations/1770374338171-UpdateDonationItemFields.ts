import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDonationItemFields1770374338171 implements MigrationInterface {
    name = 'UpdateDonationItemFields1770374338171'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`donation_items\` ADD \`name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`donation_items\` ADD \`unit\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`donation_items\` ADD \`expirationDate\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`donation_items\` ADD \`status\` enum ('SUBMITTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'ALLOCATED', 'DISPATCHED', 'DELIVERED') NOT NULL DEFAULT 'SUBMITTED'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`donation_items\` DROP COLUMN \`status\``);
        await queryRunner.query(`ALTER TABLE \`donation_items\` DROP COLUMN \`expirationDate\``);
        await queryRunner.query(`ALTER TABLE \`donation_items\` DROP COLUMN \`unit\``);
        await queryRunner.query(`ALTER TABLE \`donation_items\` DROP COLUMN \`name\``);
    }

}
