import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamRegistrationRequests1773319607531 implements MigrationInterface {
    name = 'AddTeamRegistrationRequests1773319607531'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`team_registration_requests\` (\`id\` varchar(36) NOT NULL, \`requestedById\` varchar(255) NOT NULL, \`name\` varchar(255) NOT NULL, \`area\` text CHARACTER SET "utf8mb4" NULL, \`teamSize\` int NOT NULL DEFAULT '1', \`baseLocation\` text CHARACTER SET "utf8mb4" NULL, \`latitude\` decimal(10,8) NULL, \`longitude\` decimal(11,8) NULL, \`description\` text CHARACTER SET "utf8mb4" NULL, \`specialties\` longtext NULL, \`equipmentList\` longtext NULL, \`vehicles\` longtext NULL, \`status\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending', \`reviewedById\` varchar(255) NULL, \`reviewedAt\` datetime NULL, \`reviewNote\` text CHARACTER SET "utf8mb4" NULL, \`approvedTeamId\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_4375590fa23c06e6ef5862994a\` (\`reviewedById\`), INDEX \`IDX_7287487d2f0bab4599e22c73e5\` (\`status\`), INDEX \`IDX_8f313e3a57abd33b6b6f936590\` (\`requestedById\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`team_registration_requests\` ADD CONSTRAINT \`FK_8f313e3a57abd33b6b6f936590e\` FOREIGN KEY (\`requestedById\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_registration_requests\` ADD CONSTRAINT \`FK_4375590fa23c06e6ef5862994a7\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`accounts\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team_registration_requests\` DROP FOREIGN KEY \`FK_4375590fa23c06e6ef5862994a7\``);
        await queryRunner.query(`ALTER TABLE \`team_registration_requests\` DROP FOREIGN KEY \`FK_8f313e3a57abd33b6b6f936590e\``);
        await queryRunner.query(`DROP INDEX \`IDX_8f313e3a57abd33b6b6f936590\` ON \`team_registration_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_7287487d2f0bab4599e22c73e5\` ON \`team_registration_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_4375590fa23c06e6ef5862994a\` ON \`team_registration_requests\``);
        await queryRunner.query(`DROP TABLE \`team_registration_requests\``);
    }

}
