import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRescueSupplyTeamHandoff1774281121623 implements MigrationInterface {
    name = 'AddRescueSupplyTeamHandoff1774281121623'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`rescue_supply_team_handoff_items\` (\`id\` varchar(36) NOT NULL, \`handoffId\` varchar(36) NOT NULL, \`orderItemId\` varchar(36) NOT NULL, \`categoryId\` varchar(36) NOT NULL, \`itemType\` enum ('WATER', 'FOOD', 'MEDICAL_KIT') NOT NULL, \`quantity\` int NOT NULL, \`returnedQuantity\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_130affdc0f7ffe41a3412cfe44\` (\`categoryId\`), INDEX \`IDX_efc60477ae54a44fecf407eb3d\` (\`orderItemId\`), INDEX \`IDX_7a7af2186501b2895054b9c52b\` (\`handoffId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`rescue_supply_team_handoffs\` (\`id\` varchar(36) NOT NULL, \`orderId\` varchar(36) NOT NULL, \`assignmentId\` varchar(255) NOT NULL, \`teamId\` varchar(255) NOT NULL, \`dispatchedById\` varchar(36) NOT NULL, \`receivedById\` varchar(36) NULL, \`status\` enum ('PENDING_RECEIPT', 'RECEIVED', 'CANCELED') NOT NULL DEFAULT 'PENDING_RECEIPT', \`note\` text NULL, \`dispatchedAt\` datetime NOT NULL, \`receivedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_ab03be2c73073dfaa6cf5cdb26\` (\`status\`), INDEX \`IDX_c99094211f68846575bc061a7b\` (\`teamId\`), INDEX \`IDX_830c24ae1ae1fa794f31759a9c\` (\`assignmentId\`), INDEX \`IDX_495f77104e5565a1ad0883b574\` (\`orderId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoff_items\` ADD CONSTRAINT \`FK_7a7af2186501b2895054b9c52b8\` FOREIGN KEY (\`handoffId\`) REFERENCES \`rescue_supply_team_handoffs\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoff_items\` ADD CONSTRAINT \`FK_efc60477ae54a44fecf407eb3d2\` FOREIGN KEY (\`orderItemId\`) REFERENCES \`rescue_supply_order_items\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoff_items\` ADD CONSTRAINT \`FK_130affdc0f7ffe41a3412cfe448\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` ADD CONSTRAINT \`FK_495f77104e5565a1ad0883b5741\` FOREIGN KEY (\`orderId\`) REFERENCES \`rescue_supply_orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` ADD CONSTRAINT \`FK_830c24ae1ae1fa794f31759a9c3\` FOREIGN KEY (\`assignmentId\`) REFERENCES \`rescue_assignments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` ADD CONSTRAINT \`FK_c99094211f68846575bc061a7b1\` FOREIGN KEY (\`teamId\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` ADD CONSTRAINT \`FK_5d4dfa484319040467d2023b5db\` FOREIGN KEY (\`dispatchedById\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` ADD CONSTRAINT \`FK_fbe43e08aea278a8d43415b3544\` FOREIGN KEY (\`receivedById\`) REFERENCES \`accounts\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` DROP FOREIGN KEY \`FK_fbe43e08aea278a8d43415b3544\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` DROP FOREIGN KEY \`FK_5d4dfa484319040467d2023b5db\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` DROP FOREIGN KEY \`FK_c99094211f68846575bc061a7b1\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` DROP FOREIGN KEY \`FK_830c24ae1ae1fa794f31759a9c3\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoffs\` DROP FOREIGN KEY \`FK_495f77104e5565a1ad0883b5741\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoff_items\` DROP FOREIGN KEY \`FK_130affdc0f7ffe41a3412cfe448\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoff_items\` DROP FOREIGN KEY \`FK_efc60477ae54a44fecf407eb3d2\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_team_handoff_items\` DROP FOREIGN KEY \`FK_7a7af2186501b2895054b9c52b8\``);
        await queryRunner.query(`DROP INDEX \`IDX_495f77104e5565a1ad0883b574\` ON \`rescue_supply_team_handoffs\``);
        await queryRunner.query(`DROP INDEX \`IDX_830c24ae1ae1fa794f31759a9c\` ON \`rescue_supply_team_handoffs\``);
        await queryRunner.query(`DROP INDEX \`IDX_c99094211f68846575bc061a7b\` ON \`rescue_supply_team_handoffs\``);
        await queryRunner.query(`DROP INDEX \`IDX_ab03be2c73073dfaa6cf5cdb26\` ON \`rescue_supply_team_handoffs\``);
        await queryRunner.query(`DROP TABLE \`rescue_supply_team_handoffs\``);
        await queryRunner.query(`DROP INDEX \`IDX_7a7af2186501b2895054b9c52b\` ON \`rescue_supply_team_handoff_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_efc60477ae54a44fecf407eb3d\` ON \`rescue_supply_team_handoff_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_130affdc0f7ffe41a3412cfe44\` ON \`rescue_supply_team_handoff_items\``);
        await queryRunner.query(`DROP TABLE \`rescue_supply_team_handoff_items\``);
    }

}
