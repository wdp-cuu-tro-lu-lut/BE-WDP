import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoUpdate1771857170806 implements MigrationInterface {
    name = 'AutoUpdate1771857170806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` DROP FOREIGN KEY \`FK_d03f4c337c7d7b256ae8f9ac612\``);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` ADD \`guestName\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` ADD \`guestPhone\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` CHANGE \`creatorId\` \`creatorId\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` ADD CONSTRAINT \`FK_d03f4c337c7d7b256ae8f9ac612\` FOREIGN KEY (\`creatorId\`) REFERENCES \`accounts\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` DROP FOREIGN KEY \`FK_d03f4c337c7d7b256ae8f9ac612\``);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` CHANGE \`creatorId\` \`creatorId\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` DROP COLUMN \`guestPhone\``);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` DROP COLUMN \`guestName\``);
        await queryRunner.query(`ALTER TABLE \`rescue_requests\` ADD CONSTRAINT \`FK_d03f4c337c7d7b256ae8f9ac612\` FOREIGN KEY (\`creatorId\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
