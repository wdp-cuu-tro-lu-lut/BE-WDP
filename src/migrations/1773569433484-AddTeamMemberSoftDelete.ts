import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamMemberSoftDelete1773569433484 implements MigrationInterface {
    name = 'AddTeamMemberSoftDelete1773569433484'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team_members\` ADD \`archivedAccountId\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`team_members\` ADD \`deletedAt\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`team_members\` DROP FOREIGN KEY \`FK_1ab22bb63da1a5d485d977040b9\``);
        await queryRunner.query(`ALTER TABLE \`team_members\` CHANGE \`accountId\` \`accountId\` varchar(255) NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_b84929b6567e97f63c1eaa8a6a\` ON \`team_members\` (\`archivedAccountId\`)`);
        await queryRunner.query(`ALTER TABLE \`team_members\` ADD CONSTRAINT \`FK_1ab22bb63da1a5d485d977040b9\` FOREIGN KEY (\`accountId\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team_members\` DROP FOREIGN KEY \`FK_1ab22bb63da1a5d485d977040b9\``);
        await queryRunner.query(`DROP INDEX \`IDX_b84929b6567e97f63c1eaa8a6a\` ON \`team_members\``);
        await queryRunner.query(`ALTER TABLE \`team_members\` CHANGE \`accountId\` \`accountId\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`team_members\` ADD CONSTRAINT \`FK_1ab22bb63da1a5d485d977040b9\` FOREIGN KEY (\`accountId\`) REFERENCES \`accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_members\` DROP COLUMN \`deletedAt\``);
        await queryRunner.query(`ALTER TABLE \`team_members\` DROP COLUMN \`archivedAccountId\``);
    }

}
