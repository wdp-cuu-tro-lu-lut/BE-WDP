import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateWarehouseEntitiesCategory1769767723148 implements MigrationInterface {
    name = 'UpdateWarehouseEntitiesCategory1769767723148'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_695ee4f416794e23187f58a02d\` ON \`warehouse_stocks\``);
        await queryRunner.query(`DROP INDEX \`unique_category_condition\` ON \`warehouse_stocks\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipt_items\` CHANGE \`category\` \`categoryId\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`warehouse_stocks\` CHANGE \`category\` \`categoryId\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipt_items\` DROP COLUMN \`categoryId\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipt_items\` ADD \`categoryId\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`warehouse_stocks\` DROP COLUMN \`categoryId\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_stocks\` ADD \`categoryId\` varchar(255) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_e8976ebf10c84f982569294f07\` ON \`warehouse_stocks\` (\`categoryId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`unique_category_condition\` ON \`warehouse_stocks\` (\`categoryId\`, \`condition\`)`);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipt_items\` ADD CONSTRAINT \`FK_207b2a9c5d4edd34303d35ac83e\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`warehouse_stocks\` ADD CONSTRAINT \`FK_e8976ebf10c84f982569294f07a\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`warehouse_stocks\` DROP FOREIGN KEY \`FK_e8976ebf10c84f982569294f07a\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipt_items\` DROP FOREIGN KEY \`FK_207b2a9c5d4edd34303d35ac83e\``);
        await queryRunner.query(`DROP INDEX \`unique_category_condition\` ON \`warehouse_stocks\``);
        await queryRunner.query(`DROP INDEX \`IDX_e8976ebf10c84f982569294f07\` ON \`warehouse_stocks\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_stocks\` DROP COLUMN \`categoryId\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_stocks\` ADD \`categoryId\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipt_items\` DROP COLUMN \`categoryId\``);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipt_items\` ADD \`categoryId\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`warehouse_stocks\` CHANGE \`categoryId\` \`category\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`warehouse_receipt_items\` CHANGE \`categoryId\` \`category\` varchar(100) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`unique_category_condition\` ON \`warehouse_stocks\` (\`category\`, \`condition\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_695ee4f416794e23187f58a02d\` ON \`warehouse_stocks\` (\`category\`)`);
    }

}
