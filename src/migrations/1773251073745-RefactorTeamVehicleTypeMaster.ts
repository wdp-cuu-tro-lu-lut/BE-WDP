import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorTeamVehicleTypeMaster1773251073745 implements MigrationInterface {
    name = 'RefactorTeamVehicleTypeMaster1773251073745'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasVehicleTypesTable = await queryRunner.hasTable('vehicle_types');

        if (!hasVehicleTypesTable) {
            await queryRunner.query(`CREATE TABLE \`vehicle_types\` (\`id\` varchar(36) NOT NULL, \`code\` varchar(100) NOT NULL, \`name\` varchar(150) CHARACTER SET "utf8mb4" NOT NULL, \`description\` text CHARACTER SET "utf8mb4" NULL, \`defaultCapacity\` int NOT NULL DEFAULT '0', \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, INDEX \`IDX_81989b4b9d944edbf1814b01e4\` (\`isActive\`), UNIQUE INDEX \`IDX_d3cfbe7b0cdb6624573ca9a81b\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        }

        await queryRunner.query(`INSERT INTO \`vehicle_types\` (\`id\`, \`code\`, \`name\`, \`description\`, \`defaultCapacity\`, \`isActive\`) VALUES
            ('8c1a63d8-29e4-44f2-8e73-c4cc8c59e101', 'xe_cuu_thuong', 'Xe cứu thương', 'Xe chuyên dụng để sơ cứu và vận chuyển nạn nhân.', 4, 1),
            ('8c1a63d8-29e4-44f2-8e73-c4cc8c59e102', 'xe_ban_tai', 'Xe bán tải cứu hộ', 'Xe bán tải phục vụ chở người và hàng cứu trợ.', 6, 1),
            ('8c1a63d8-29e4-44f2-8e73-c4cc8c59e103', 'cano_cuu_ho', 'Ca nô cứu hộ', 'Phương tiện đường thủy dùng trong cứu hộ ngập lụt.', 8, 1),
            ('8c1a63d8-29e4-44f2-8e73-c4cc8c59e104', 'xe_tai_nhe', 'Xe tải nhẹ', 'Xe tải nhỏ dùng để chở vật tư và hàng cứu trợ.', 12, 1),
            ('8c1a63d8-29e4-44f2-8e73-c4cc8c59e105', 'phuong_tien_khac', 'Phương tiện khác', 'Loại phương tiện khác được migrate từ dữ liệu cũ hoặc khai báo bổ sung.', 0, 1)
            ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`),
            \`description\` = VALUES(\`description\`),
            \`defaultCapacity\` = VALUES(\`defaultCapacity\`),
            \`isActive\` = VALUES(\`isActive\`)`);

        const hasLegacyVehicleType = await queryRunner.hasColumn('team_vehicles', 'legacyVehicleType');
        const hasVehicleType = await queryRunner.hasColumn('team_vehicles', 'vehicleType');
        const hasVehicleTypeId = await queryRunner.hasColumn('team_vehicles', 'vehicleTypeId');

        if (hasVehicleType && !hasLegacyVehicleType) {
            await queryRunner.query(`ALTER TABLE \`team_vehicles\` CHANGE \`vehicleType\` \`legacyVehicleType\` varchar(100) NOT NULL`);
        }

        if (!hasVehicleTypeId) {
            await queryRunner.query(`ALTER TABLE \`team_vehicles\` ADD \`vehicleTypeId\` varchar(255) NULL`);
        }

        if (await queryRunner.hasColumn('team_vehicles', 'legacyVehicleType')) {
            await queryRunner.query(`INSERT INTO \`vehicle_types\` (\`id\`, \`code\`, \`name\`, \`description\`, \`defaultCapacity\`, \`isActive\`, \`createdAt\`, \`updatedAt\`)
                SELECT UUID(), CONCAT('legacy_', LOWER(REPLACE(REPLACE(REPLACE(TRIM(tv.legacyVehicleType), ' ', '_'), '-', '_'), '/', '_'))), tv.legacyVehicleType, 'Tự động tạo từ dữ liệu vehicle type cũ.', 0, 1, NOW(), NOW()
                FROM (SELECT DISTINCT \`legacyVehicleType\` FROM \`team_vehicles\` WHERE \`legacyVehicleType\` IS NOT NULL AND TRIM(\`legacyVehicleType\`) <> '') tv
                LEFT JOIN \`vehicle_types\` vt ON LOWER(vt.\`name\`) COLLATE utf8mb4_unicode_ci = LOWER(tv.\`legacyVehicleType\`) COLLATE utf8mb4_unicode_ci
                WHERE vt.\`id\` IS NULL`);

            await queryRunner.query(`UPDATE \`team_vehicles\` tv
                LEFT JOIN \`vehicle_types\` vt ON LOWER(vt.\`name\`) COLLATE utf8mb4_unicode_ci = LOWER(tv.\`legacyVehicleType\`) COLLATE utf8mb4_unicode_ci
                SET tv.\`vehicleTypeId\` = vt.\`id\``);

            await queryRunner.query(`UPDATE \`team_vehicles\`
                SET \`vehicleTypeId\` = '8c1a63d8-29e4-44f2-8e73-c4cc8c59e105'
                WHERE \`vehicleTypeId\` IS NULL`);

            await queryRunner.query(`ALTER TABLE \`team_vehicles\` DROP COLUMN \`legacyVehicleType\``);
        }

        await queryRunner.query(`ALTER TABLE \`team_vehicles\` CHANGE \`vehicleTypeId\` \`vehicleTypeId\` varchar(255) NOT NULL`);

        const foreignKeys: Array<{ CONSTRAINT_NAME: string }> = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'team_vehicles'
              AND COLUMN_NAME = 'vehicleTypeId'
              AND REFERENCED_TABLE_NAME = 'vehicle_types'
        `);

        if (foreignKeys.length === 0) {
            await queryRunner.query(`ALTER TABLE \`team_vehicles\` ADD CONSTRAINT \`FK_7cf54e629e19ce435270deab83a\` FOREIGN KEY (\`vehicleTypeId\`) REFERENCES \`vehicle_types\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const foreignKeys: Array<{ CONSTRAINT_NAME: string }> = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'team_vehicles'
              AND COLUMN_NAME = 'vehicleTypeId'
              AND REFERENCED_TABLE_NAME = 'vehicle_types'
        `);

        if (foreignKeys.length > 0) {
            await queryRunner.query(`ALTER TABLE \`team_vehicles\` DROP FOREIGN KEY \`FK_7cf54e629e19ce435270deab83a\``);
        }

        const hasVehicleTypeId = await queryRunner.hasColumn('team_vehicles', 'vehicleTypeId');
        const hasVehicleType = await queryRunner.hasColumn('team_vehicles', 'vehicleType');

        if (hasVehicleTypeId && !hasVehicleType) {
            await queryRunner.query(`ALTER TABLE \`team_vehicles\` CHANGE \`vehicleTypeId\` \`legacyVehicleTypeId\` varchar(255) NOT NULL`);
            await queryRunner.query(`ALTER TABLE \`team_vehicles\` ADD \`vehicleType\` varchar(100) NOT NULL`);
            await queryRunner.query(`UPDATE \`team_vehicles\` tv
                LEFT JOIN \`vehicle_types\` vt ON vt.\`id\` = tv.\`legacyVehicleTypeId\`
                SET tv.\`vehicleType\` = COALESCE(vt.\`name\`, 'Phương tiện khác')`);
            await queryRunner.query(`ALTER TABLE \`team_vehicles\` DROP COLUMN \`legacyVehicleTypeId\``);
        }

        if (await queryRunner.hasTable('vehicle_types')) {
            await queryRunner.query(`DROP INDEX \`IDX_d3cfbe7b0cdb6624573ca9a81b\` ON \`vehicle_types\``);
            await queryRunner.query(`DROP INDEX \`IDX_81989b4b9d944edbf1814b01e4\` ON \`vehicle_types\``);
            await queryRunner.query(`DROP TABLE \`vehicle_types\``);
        }
    }

}
