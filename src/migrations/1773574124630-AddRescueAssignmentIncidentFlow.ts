import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRescueAssignmentIncidentFlow1773574124630 implements MigrationInterface {
    name = 'AddRescueAssignmentIncidentFlow1773574124630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`unique_rescue_supply_order_request\` ON \`rescue_supply_orders\``);
        await queryRunner.query(`ALTER TABLE \`rescue_assignments\` ADD \`incidentNote\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`rescue_assignments\` ADD \`incidentReportedAt\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`rescue_assignments\` DROP COLUMN \`incidentReportedAt\``);
        await queryRunner.query(`ALTER TABLE \`rescue_assignments\` DROP COLUMN \`incidentNote\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`unique_rescue_supply_order_request\` ON \`rescue_supply_orders\` (\`rescueRequestId\`)`);
    }

}
