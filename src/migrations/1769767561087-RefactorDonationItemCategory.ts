import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorDonationItemCategory1769767561087 implements MigrationInterface {
    name = 'RefactorDonationItemCategory1769767561087'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`donation_items\` CHANGE \`category\` \`categoryId\` varchar(100) NOT NULL`);
        await queryRunner.query(`CREATE TABLE \`categories\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(100) NOT NULL, \`description\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_8b0be371d28245da6e4f4b6187\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`donation_items\` DROP COLUMN \`categoryId\``);
        await queryRunner.query(`ALTER TABLE \`donation_items\` ADD \`categoryId\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`donation_items\` ADD CONSTRAINT \`FK_1a9f61c9c5177bc925fc16b9383\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`donation_items\` DROP FOREIGN KEY \`FK_1a9f61c9c5177bc925fc16b9383\``);
        await queryRunner.query(`ALTER TABLE \`donation_items\` DROP COLUMN \`categoryId\``);
        await queryRunner.query(`ALTER TABLE \`donation_items\` ADD \`categoryId\` varchar(100) NOT NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_8b0be371d28245da6e4f4b6187\` ON \`categories\``);
        await queryRunner.query(`DROP TABLE \`categories\``);
        await queryRunner.query(`ALTER TABLE \`donation_items\` CHANGE \`categoryId\` \`category\` varchar(100) NOT NULL`);
    }

}
