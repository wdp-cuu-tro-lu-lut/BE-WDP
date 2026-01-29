import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountIdToTeam1769676666048 implements MigrationInterface {
    name = 'AddAccountIdToTeam1769676666048'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Just add the column, ignore other noise from TypeORM trying to sync everything
        const table = await queryRunner.getTable("teams");
        const column = table?.findColumnByName("accountId");
        if (!column) {
            await queryRunner.query(`ALTER TABLE \`teams\` ADD \`accountId\` varchar(36) NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`accountId\``);
    }
}
