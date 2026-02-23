import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoUpdate1771861909192 implements MigrationInterface {
    name = 'AutoUpdate1771861909192'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` ADD \`requiredTeams\` int NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` ADD \`estimatedPeople\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` DROP COLUMN \`estimatedPeople\``);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` DROP COLUMN \`requiredTeams\``);
    }

}
