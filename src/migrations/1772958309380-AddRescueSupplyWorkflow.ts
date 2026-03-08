import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRescueSupplyWorkflow1772958309380 implements MigrationInterface {
    name = 'AddRescueSupplyWorkflow1772958309380'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`warehouse_transactions\` (\`id\` varchar(36) NOT NULL, \`categoryId\` varchar(36) NOT NULL, \`performedById\` varchar(36) NULL, \`type\` enum ('IN', 'OUT') NOT NULL, \`source\` enum ('DONATION_RECEIPT', 'ALLOCATION_DISPATCH', 'RESCUE_DISPATCH', 'RESCUE_RETURN', 'MANUAL_REPLENISHMENT') NOT NULL, \`referenceId\` varchar(36) NOT NULL, \`quantity\` int NOT NULL, \`balanceBefore\` int NOT NULL, \`balanceAfter\` int NOT NULL, \`note\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_fb5e42bba5e84bbb8aed5deaeb\` (\`referenceId\`), INDEX \`IDX_4baa39e4fd4c194bdcc032999c\` (\`type\`), INDEX \`IDX_16ef5144be06ffcad6e6738f89\` (\`source\`), INDEX \`IDX_10c59ca0638b36cb4e4e6203a9\` (\`performedById\`), INDEX \`IDX_53094032fb233edac0f85c2a85\` (\`categoryId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`rescue_supply_order_items\` (\`id\` varchar(36) NOT NULL, \`orderId\` varchar(36) NOT NULL, \`categoryId\` varchar(36) NOT NULL, \`itemType\` enum ('WATER', 'FOOD', 'MEDICAL_KIT') NOT NULL, \`requestedQuantity\` int NOT NULL, \`dispatchedQuantity\` int NOT NULL DEFAULT '0', \`returnedQuantity\` int NOT NULL DEFAULT '0', \`lastShortageQuantity\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_c1c77d986e429b430f2bdfebfe\` (\`categoryId\`), INDEX \`IDX_993fdb20fd9cf514ec49f7cd8d\` (\`orderId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`replenishment_request_items\` (\`id\` varchar(36) NOT NULL, \`requestId\` varchar(36) NOT NULL, \`categoryId\` varchar(36) NOT NULL, \`itemType\` enum ('WATER', 'FOOD', 'MEDICAL_KIT') NOT NULL, \`requestedQuantity\` int NOT NULL, \`approvedQuantity\` int NOT NULL DEFAULT '0', \`condition\` enum ('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NOT NULL DEFAULT 'EXCELLENT', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_ad71ea516cd60ea4429eaa56f6\` (\`categoryId\`), INDEX \`IDX_0c731478e4cf8ad863896bd9ea\` (\`requestId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`replenishment_requests\` (\`id\` varchar(36) NOT NULL, \`orderId\` varchar(36) NOT NULL, \`createdById\` varchar(36) NOT NULL, \`reviewedById\` varchar(36) NULL, \`status\` enum ('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING', \`note\` text NULL, \`decisionNote\` text NULL, \`reviewedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_32609aa378b7e8eaa5919633aa\` (\`status\`), INDEX \`IDX_0d31911956902fb5de7573d26e\` (\`reviewedById\`), INDEX \`IDX_80e4a6a9e402ca00570b04d2eb\` (\`createdById\`), INDEX \`IDX_aaae58b92280d5440e1fffbb04\` (\`orderId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`rescue_supply_orders\` (\`id\` varchar(36) NOT NULL, \`rescueRequestId\` varchar(36) NOT NULL, \`createdById\` varchar(36) NOT NULL, \`estimatedPeople\` int NOT NULL, \`priority\` enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL, \`totalRescuers\` int NOT NULL DEFAULT '0', \`status\` enum ('PLANNED', 'INSUFFICIENT', 'READY', 'DISPATCHED', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'PLANNED', \`lastStockCheckAt\` datetime NULL, \`dispatchedAt\` datetime NULL, \`completedAt\` datetime NULL, \`note\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_bff968d6dc70f3c07680b262b8\` (\`status\`), INDEX \`IDX_97df5f8661b0fdee16b98b43d4\` (\`createdById\`), INDEX \`IDX_cae9111ebcc793ab9cc74dc119\` (\`rescueRequestId\`), UNIQUE INDEX \`unique_rescue_supply_order_request\` (\`rescueRequestId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD UNIQUE INDEX \`IDX_c06037bebc5905094c9f165189\` (\`accountId\`)`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD CONSTRAINT \`FK_c06037bebc5905094c9f1651897\` FOREIGN KEY (\`accountId\`) REFERENCES \`accounts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`warehouse_transactions\` ADD CONSTRAINT \`FK_53094032fb233edac0f85c2a854\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`warehouse_transactions\` ADD CONSTRAINT \`FK_10c59ca0638b36cb4e4e6203a94\` FOREIGN KEY (\`performedById\`) REFERENCES \`accounts\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_order_items\` ADD CONSTRAINT \`FK_993fdb20fd9cf514ec49f7cd8da\` FOREIGN KEY (\`orderId\`) REFERENCES \`rescue_supply_orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_order_items\` ADD CONSTRAINT \`FK_c1c77d986e429b430f2bdfebfe3\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`replenishment_request_items\` ADD CONSTRAINT \`FK_0c731478e4cf8ad863896bd9ea9\` FOREIGN KEY (\`requestId\`) REFERENCES \`replenishment_requests\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`replenishment_request_items\` ADD CONSTRAINT \`FK_ad71ea516cd60ea4429eaa56f66\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`replenishment_requests\` ADD CONSTRAINT \`FK_aaae58b92280d5440e1fffbb041\` FOREIGN KEY (\`orderId\`) REFERENCES \`rescue_supply_orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`replenishment_requests\` ADD CONSTRAINT \`FK_80e4a6a9e402ca00570b04d2ebd\` FOREIGN KEY (\`createdById\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`replenishment_requests\` ADD CONSTRAINT \`FK_0d31911956902fb5de7573d26eb\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`accounts\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_orders\` ADD CONSTRAINT \`FK_cae9111ebcc793ab9cc74dc1190\` FOREIGN KEY (\`rescueRequestId\`) REFERENCES \`rescue_requests\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_orders\` ADD CONSTRAINT \`FK_97df5f8661b0fdee16b98b43d43\` FOREIGN KEY (\`createdById\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`rescue_supply_orders\` DROP FOREIGN KEY \`FK_97df5f8661b0fdee16b98b43d43\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_orders\` DROP FOREIGN KEY \`FK_cae9111ebcc793ab9cc74dc1190\``);
        await queryRunner.query(`ALTER TABLE \`replenishment_requests\` DROP FOREIGN KEY \`FK_0d31911956902fb5de7573d26eb\``);
        await queryRunner.query(`ALTER TABLE \`replenishment_requests\` DROP FOREIGN KEY \`FK_80e4a6a9e402ca00570b04d2ebd\``);
        await queryRunner.query(`ALTER TABLE \`replenishment_requests\` DROP FOREIGN KEY \`FK_aaae58b92280d5440e1fffbb041\``);
        await queryRunner.query(`ALTER TABLE \`replenishment_request_items\` DROP FOREIGN KEY \`FK_ad71ea516cd60ea4429eaa56f66\``);
        await queryRunner.query(`ALTER TABLE \`replenishment_request_items\` DROP FOREIGN KEY \`FK_0c731478e4cf8ad863896bd9ea9\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_order_items\` DROP FOREIGN KEY \`FK_c1c77d986e429b430f2bdfebfe3\``);
        await queryRunner.query(`ALTER TABLE \`rescue_supply_order_items\` DROP FOREIGN KEY \`FK_993fdb20fd9cf514ec49f7cd8da\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_transactions\` DROP FOREIGN KEY \`FK_10c59ca0638b36cb4e4e6203a94\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_transactions\` DROP FOREIGN KEY \`FK_53094032fb233edac0f85c2a854\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP FOREIGN KEY \`FK_c06037bebc5905094c9f1651897\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP INDEX \`IDX_c06037bebc5905094c9f165189\``);
        await queryRunner.query(`DROP INDEX \`unique_rescue_supply_order_request\` ON \`rescue_supply_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_cae9111ebcc793ab9cc74dc119\` ON \`rescue_supply_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_97df5f8661b0fdee16b98b43d4\` ON \`rescue_supply_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_bff968d6dc70f3c07680b262b8\` ON \`rescue_supply_orders\``);
        await queryRunner.query(`DROP TABLE \`rescue_supply_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_aaae58b92280d5440e1fffbb04\` ON \`replenishment_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_80e4a6a9e402ca00570b04d2eb\` ON \`replenishment_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_0d31911956902fb5de7573d26e\` ON \`replenishment_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_32609aa378b7e8eaa5919633aa\` ON \`replenishment_requests\``);
        await queryRunner.query(`DROP TABLE \`replenishment_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_0c731478e4cf8ad863896bd9ea\` ON \`replenishment_request_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_ad71ea516cd60ea4429eaa56f6\` ON \`replenishment_request_items\``);
        await queryRunner.query(`DROP TABLE \`replenishment_request_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_993fdb20fd9cf514ec49f7cd8d\` ON \`rescue_supply_order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_c1c77d986e429b430f2bdfebfe\` ON \`rescue_supply_order_items\``);
        await queryRunner.query(`DROP TABLE \`rescue_supply_order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_53094032fb233edac0f85c2a85\` ON \`warehouse_transactions\``);
        await queryRunner.query(`DROP INDEX \`IDX_10c59ca0638b36cb4e4e6203a9\` ON \`warehouse_transactions\``);
        await queryRunner.query(`DROP INDEX \`IDX_16ef5144be06ffcad6e6738f89\` ON \`warehouse_transactions\``);
        await queryRunner.query(`DROP INDEX \`IDX_4baa39e4fd4c194bdcc032999c\` ON \`warehouse_transactions\``);
        await queryRunner.query(`DROP INDEX \`IDX_fb5e42bba5e84bbb8aed5deaeb\` ON \`warehouse_transactions\``);
        await queryRunner.query(`DROP TABLE \`warehouse_transactions\``);
    }

}
