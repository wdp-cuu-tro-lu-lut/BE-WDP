import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamDetailAssets1773250299488 implements MigrationInterface {
    name = 'AddTeamDetailAssets1773250299488'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`team_equipment\` (\`id\` varchar(36) NOT NULL, \`teamId\` varchar(255) NOT NULL, \`equipmentName\` varchar(255) NOT NULL, \`quantity\` int NOT NULL DEFAULT '0', \`status\` enum ('ready', 'in_use', 'maintenance') NOT NULL DEFAULT 'ready', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, INDEX \`IDX_65dc970dfd2017051c3ebc49d3\` (\`status\`), INDEX \`IDX_d79e658657450532ad5473fc28\` (\`teamId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`team_specialties\` (\`id\` varchar(36) NOT NULL, \`teamId\` varchar(255) NOT NULL, \`code\` varchar(100) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, INDEX \`IDX_5c314aa381dd9af18ed92697df\` (\`code\`), INDEX \`IDX_e3052a2ab32708a829695a77b8\` (\`teamId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`team_vehicles\` (\`id\` varchar(36) NOT NULL, \`teamId\` varchar(255) NOT NULL, \`vehicleType\` varchar(100) NOT NULL, \`plateNumber\` varchar(50) NOT NULL, \`capacity\` int NOT NULL DEFAULT '0', \`status\` enum ('ready', 'in_use', 'maintenance') NOT NULL DEFAULT 'ready', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, INDEX \`IDX_c376c0950818ce03a04c69af01\` (\`status\`), UNIQUE INDEX \`IDX_b201f93ebc71ca047e07da193b\` (\`plateNumber\`), INDEX \`IDX_308ec4246d231f6ed505cc6843\` (\`teamId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`baseLocation\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`latitude\` decimal(10,8) NULL`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`longitude\` decimal(11,8) NULL`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`rating\` decimal(3,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`team_equipment\` ADD CONSTRAINT \`FK_d79e658657450532ad5473fc281\` FOREIGN KEY (\`teamId\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_specialties\` ADD CONSTRAINT \`FK_e3052a2ab32708a829695a77b85\` FOREIGN KEY (\`teamId\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_vehicles\` ADD CONSTRAINT \`FK_308ec4246d231f6ed505cc68433\` FOREIGN KEY (\`teamId\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team_vehicles\` DROP FOREIGN KEY \`FK_308ec4246d231f6ed505cc68433\``);
        await queryRunner.query(`ALTER TABLE \`team_specialties\` DROP FOREIGN KEY \`FK_e3052a2ab32708a829695a77b85\``);
        await queryRunner.query(`ALTER TABLE \`team_equipment\` DROP FOREIGN KEY \`FK_d79e658657450532ad5473fc281\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`rating\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`longitude\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`latitude\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`baseLocation\``);
        await queryRunner.query(`DROP INDEX \`IDX_308ec4246d231f6ed505cc6843\` ON \`team_vehicles\``);
        await queryRunner.query(`DROP INDEX \`IDX_b201f93ebc71ca047e07da193b\` ON \`team_vehicles\``);
        await queryRunner.query(`DROP INDEX \`IDX_c376c0950818ce03a04c69af01\` ON \`team_vehicles\``);
        await queryRunner.query(`DROP TABLE \`team_vehicles\``);
        await queryRunner.query(`DROP INDEX \`IDX_e3052a2ab32708a829695a77b8\` ON \`team_specialties\``);
        await queryRunner.query(`DROP INDEX \`IDX_5c314aa381dd9af18ed92697df\` ON \`team_specialties\``);
        await queryRunner.query(`DROP TABLE \`team_specialties\``);
        await queryRunner.query(`DROP INDEX \`IDX_d79e658657450532ad5473fc28\` ON \`team_equipment\``);
        await queryRunner.query(`DROP INDEX \`IDX_65dc970dfd2017051c3ebc49d3\` ON \`team_equipment\``);
        await queryRunner.query(`DROP TABLE \`team_equipment\``);
    }

}
