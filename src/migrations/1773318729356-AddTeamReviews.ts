import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamReviews1773318729356 implements MigrationInterface {
    name = 'AddTeamReviews1773318729356'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`team_reviews\` (\`id\` varchar(36) NOT NULL, \`rescueRequestId\` varchar(255) NOT NULL, \`teamId\` varchar(255) NOT NULL, \`reviewerId\` varchar(255) NOT NULL, \`rating\` int NOT NULL, \`outcome\` enum ('success', 'failed') NOT NULL, \`comment\` text CHARACTER SET "utf8mb4" NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_847b4df408fb0296eb841d8203\` (\`reviewerId\`), INDEX \`IDX_e2ba81f6e9d490b9b50b33e2fd\` (\`rescueRequestId\`), INDEX \`IDX_a698298bb577b84ea6b85865d0\` (\`teamId\`), UNIQUE INDEX \`unique_team_review_per_request\` (\`rescueRequestId\`, \`teamId\`, \`reviewerId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`team_reviews\` ADD CONSTRAINT \`FK_e2ba81f6e9d490b9b50b33e2fd1\` FOREIGN KEY (\`rescueRequestId\`) REFERENCES \`rescue_requests\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_reviews\` ADD CONSTRAINT \`FK_a698298bb577b84ea6b85865d02\` FOREIGN KEY (\`teamId\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_reviews\` ADD CONSTRAINT \`FK_847b4df408fb0296eb841d82034\` FOREIGN KEY (\`reviewerId\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team_reviews\` DROP FOREIGN KEY \`FK_847b4df408fb0296eb841d82034\``);
        await queryRunner.query(`ALTER TABLE \`team_reviews\` DROP FOREIGN KEY \`FK_a698298bb577b84ea6b85865d02\``);
        await queryRunner.query(`ALTER TABLE \`team_reviews\` DROP FOREIGN KEY \`FK_e2ba81f6e9d490b9b50b33e2fd1\``);
        await queryRunner.query(`DROP INDEX \`unique_team_review_per_request\` ON \`team_reviews\``);
        await queryRunner.query(`DROP INDEX \`IDX_a698298bb577b84ea6b85865d0\` ON \`team_reviews\``);
        await queryRunner.query(`DROP INDEX \`IDX_e2ba81f6e9d490b9b50b33e2fd\` ON \`team_reviews\``);
        await queryRunner.query(`DROP INDEX \`IDX_847b4df408fb0296eb841d8203\` ON \`team_reviews\``);
        await queryRunner.query(`DROP TABLE \`team_reviews\``);
    }

}
