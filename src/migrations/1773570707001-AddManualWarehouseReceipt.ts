import { MigrationInterface, QueryRunner } from "typeorm";

export class AddManualWarehouseReceipt1773570707001 implements MigrationInterface {
    name = 'AddManualWarehouseReceipt1773570707001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`warehouse_receipts\` ADD \`receiptType\` enum ('DONATION', 'MANUAL') NOT NULL DEFAULT 'DONATION'`);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipts\` ADD \`referenceCode\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipts\` ADD \`note\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`warehouse_transactions\` CHANGE \`source\` \`source\` enum ('DONATION_RECEIPT', 'MANUAL_STOCK_ENTRY', 'ALLOCATION_DISPATCH', 'RESCUE_DISPATCH', 'RESCUE_RETURN', 'MANUAL_REPLENISHMENT') NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_26b45b8639c799396a67f0de74\` ON \`warehouse_receipts\` (\`receiptType\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_26b45b8639c799396a67f0de74\` ON \`warehouse_receipts\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_transactions\` CHANGE \`source\` \`source\` enum ('DONATION_RECEIPT', 'ALLOCATION_DISPATCH', 'RESCUE_DISPATCH', 'RESCUE_RETURN', 'MANUAL_REPLENISHMENT') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipts\` DROP COLUMN \`note\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipts\` DROP COLUMN \`referenceCode\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipts\` DROP COLUMN \`receiptType\``);
    }

}
