import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamMembers1773294132967 implements MigrationInterface {
    name = 'AddTeamMembers1773294132967'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`team_members\` (\`id\` varchar(36) NOT NULL, \`teamId\` varchar(255) NOT NULL, \`accountId\` varchar(255) NOT NULL, \`role\` enum ('team_leader', 'member') NOT NULL DEFAULT 'member', \`status\` enum ('active', 'on_leave', 'inactive') NOT NULL DEFAULT 'active', \`joinedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_1ab22bb63da1a5d485d977040b\` (\`accountId\`), INDEX \`IDX_6d1c8c7f705803f0711336a5c3\` (\`teamId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`team_members\` ADD CONSTRAINT \`FK_6d1c8c7f705803f0711336a5c33\` FOREIGN KEY (\`teamId\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_members\` ADD CONSTRAINT \`FK_1ab22bb63da1a5d485d977040b9\` FOREIGN KEY (\`accountId\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team_members\` DROP FOREIGN KEY \`FK_1ab22bb63da1a5d485d977040b9\``);
        await queryRunner.query(`ALTER TABLE \`team_members\` DROP FOREIGN KEY \`FK_6d1c8c7f705803f0711336a5c33\``);
        await queryRunner.query(`DROP INDEX \`IDX_6d1c8c7f705803f0711336a5c3\` ON \`team_members\``);
        await queryRunner.query(`DROP INDEX \`IDX_1ab22bb63da1a5d485d977040b\` ON \`team_members\``);
        await queryRunner.query(`DROP TABLE \`team_members\``);
    }

}
