import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoUpdate1772812461358 implements MigrationInterface {
    name = 'AutoUpdate1772812461358'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasEvidenceImages = await queryRunner.hasColumn(
            'rescue_requests',
            'evidenceImages',
        );

        if (!hasEvidenceImages) {
            await queryRunner.query(`ALTER TABLE \`rescue_requests\` ADD \`evidenceImages\` text NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasEvidenceImages = await queryRunner.hasColumn(
            'rescue_requests',
            'evidenceImages',
        );

        if (hasEvidenceImages) {
            await queryRunner.query(`ALTER TABLE \`rescue_requests\` DROP COLUMN \`evidenceImages\``);
        }
    }

}
