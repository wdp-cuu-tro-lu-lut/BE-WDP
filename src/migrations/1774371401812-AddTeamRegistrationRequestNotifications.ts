import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamRegistrationRequestNotifications1774371401812 implements MigrationInterface {
    name = 'AddTeamRegistrationRequestNotifications1774371401812'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_f266d75879e3271bc18806987c\` ON \`staff_notifications\``);
        await queryRunner.query(`ALTER TABLE \`staff_notifications\` CHANGE \`type\` \`type\` enum ('PENDING_DONATION_CREATED', 'VOLUNTEER_REGISTRATION_CREATED', 'RESCUE_REQUEST_CREATED', 'REPLENISHMENT_REQUEST_CREATED', 'RESCUE_ASSIGNMENT_ACCEPTED', 'TEAM_REGISTRATION_REQUEST_CREATED') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`staff_notifications\` CHANGE \`category\` \`category\` enum ('PRODUCTS', 'VOLUNTEERS', 'RESCUE_REQUESTS', 'REPLENISHMENT_REQUESTS', 'TEAM_REGISTRATION_REQUESTS') NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_f266d75879e3271bc18806987c\` ON \`staff_notifications\` (\`recipientAccountId\`, \`category\`, \`readAt\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_f266d75879e3271bc18806987c\` ON \`staff_notifications\``);
        await queryRunner.query(`ALTER TABLE \`staff_notifications\` CHANGE \`category\` \`category\` enum ('PRODUCTS', 'VOLUNTEERS', 'RESCUE_REQUESTS', 'REPLENISHMENT_REQUESTS') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`staff_notifications\` CHANGE \`type\` \`type\` enum ('PENDING_DONATION_CREATED', 'VOLUNTEER_REGISTRATION_CREATED', 'RESCUE_REQUEST_CREATED', 'REPLENISHMENT_REQUEST_CREATED', 'RESCUE_ASSIGNMENT_ACCEPTED') NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_f266d75879e3271bc18806987c\` ON \`staff_notifications\` (\`recipientAccountId\`, \`category\`, \`readAt\`)`);
    }

}
