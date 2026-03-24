import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoUpdate1774365120377 implements MigrationInterface {
    name = 'AutoUpdate1774365120377'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`staff_notifications\` (\`id\` varchar(36) NOT NULL, \`recipientAccountId\` varchar(255) NOT NULL, \`type\` enum ('PENDING_DONATION_CREATED', 'VOLUNTEER_REGISTRATION_CREATED', 'RESCUE_REQUEST_CREATED', 'REPLENISHMENT_REQUEST_CREATED', 'RESCUE_ASSIGNMENT_ACCEPTED') NOT NULL, \`category\` enum ('PRODUCTS', 'VOLUNTEERS', 'RESCUE_REQUESTS', 'REPLENISHMENT_REQUESTS') NOT NULL, \`title\` varchar(255) NOT NULL, \`message\` text NOT NULL, \`severity\` enum ('info', 'warning', 'critical') NOT NULL DEFAULT 'info', \`data\` json NULL, \`readAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_f266d75879e3271bc18806987c\` (\`recipientAccountId\`, \`category\`, \`readAt\`), INDEX \`IDX_ee40e6668dac6e5cd294f808d9\` (\`createdAt\`), INDEX \`IDX_057f14cb1af505ba6a7c9b6192\` (\`readAt\`), INDEX \`IDX_268063d98ad9d47bc0aa69b52d\` (\`category\`), INDEX \`IDX_e181caf909880ee8458739f73a\` (\`recipientAccountId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`staff_notifications\` ADD CONSTRAINT \`FK_e181caf909880ee8458739f73a7\` FOREIGN KEY (\`recipientAccountId\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`staff_notifications\` DROP FOREIGN KEY \`FK_e181caf909880ee8458739f73a7\``);
        await queryRunner.query(`DROP INDEX \`IDX_e181caf909880ee8458739f73a\` ON \`staff_notifications\``);
        await queryRunner.query(`DROP INDEX \`IDX_268063d98ad9d47bc0aa69b52d\` ON \`staff_notifications\``);
        await queryRunner.query(`DROP INDEX \`IDX_057f14cb1af505ba6a7c9b6192\` ON \`staff_notifications\``);
        await queryRunner.query(`DROP INDEX \`IDX_ee40e6668dac6e5cd294f808d9\` ON \`staff_notifications\``);
        await queryRunner.query(`DROP INDEX \`IDX_f266d75879e3271bc18806987c\` ON \`staff_notifications\``);
        await queryRunner.query(`DROP TABLE \`staff_notifications\``);
    }

}
