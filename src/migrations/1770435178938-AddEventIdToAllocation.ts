import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventIdToAllocation1770435178938 implements MigrationInterface {
    name = 'AddEventIdToAllocation1770435178938'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`allocations\` ADD \`eventId\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`allocations\` ADD CONSTRAINT \`FK_bf97aab281648c499258c238cc0\` FOREIGN KEY (\`eventId\`) REFERENCES \`events\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`allocations\` DROP FOREIGN KEY \`FK_bf97aab281648c499258c238cc0\``);
        await queryRunner.query(`ALTER TABLE \`allocations\` DROP COLUMN \`eventId\``);
    }

}
