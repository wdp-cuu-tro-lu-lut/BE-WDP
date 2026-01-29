import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1705600000000 implements MigrationInterface {
  name = 'InitialMigration1705600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Accounts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NULL,
        phone VARCHAR(20) UNIQUE NULL,
        passwordHash VARCHAR(255) NOT NULL,
        role ENUM('USER', 'RESCUE_TEAM', 'STAFF', 'ADMIN') DEFAULT 'USER',
        isActive BOOLEAN DEFAULT true,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_email (email),
        INDEX idx_phone (phone),
        INDEX idx_role (role)
      )
    `);

    // Profiles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(36) PRIMARY KEY,
        accountId VARCHAR(36) NOT NULL UNIQUE,
        fullName VARCHAR(255) NOT NULL,
        address TEXT,
        avatarUrl VARCHAR(500),
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);

    // Refresh Tokens
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(36) PRIMARY KEY,
        accountId VARCHAR(36) NOT NULL,
        tokenHash TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        revokedAt DATETIME,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
        INDEX idx_account_revoked (accountId, revokedAt)
      )
    `);

    // Teams
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        area TEXT,
        teamSize INT DEFAULT 0,
        isActive BOOLEAN DEFAULT true,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_isActive (isActive)
      )
    `);

    // Events
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('VOLUNTEER', 'DONATION') NOT NULL,
        status ENUM('DRAFT', 'OPEN', 'CLOSED', 'CANCELED') DEFAULT 'DRAFT',
        startDate DATETIME,
        endDate DATETIME,
        location TEXT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_status (status),
        INDEX idx_type (type)
      )
    `);

    // Volunteer Registrations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS volunteer_registrations (
        id VARCHAR(36) PRIMARY KEY,
        eventId VARCHAR(36) NOT NULL,
        accountId VARCHAR(36) NOT NULL,
        note TEXT,
        registeredAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY unique_event_user (eventId, accountId),
        FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
        INDEX idx_eventId (eventId),
        INDEX idx_accountId (accountId)
      )
    `);

    // Rescue Requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rescue_requests (
        id VARCHAR(36) PRIMARY KEY,
        creatorId VARCHAR(36) NOT NULL,
        address TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        status ENUM('NEW', 'REVIEWED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELED', 'REJECTED') DEFAULT 'NEW',
        note TEXT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (creatorId) REFERENCES accounts(id) ON DELETE CASCADE,
        INDEX idx_creatorId (creatorId),
        INDEX idx_status (status),
        INDEX idx_priority (priority)
      )
    `);

    // Rescue Assignments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rescue_assignments (
        id VARCHAR(36) PRIMARY KEY,
        rescueRequestId VARCHAR(36) NOT NULL,
        teamId VARCHAR(36) NOT NULL,
        status ENUM('SENT', 'ACCEPTED', 'DECLINED', 'CANCELED') DEFAULT 'SENT',
        respondedAt DATETIME,
        progressNote TEXT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY unique_request_team (rescueRequestId, teamId),
        FOREIGN KEY (rescueRequestId) REFERENCES rescue_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE CASCADE,
        INDEX idx_rescueRequestId (rescueRequestId),
        INDEX idx_teamId (teamId),
        INDEX idx_status (status)
      )
    `);

    // Donations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id VARCHAR(36) PRIMARY KEY,
        creatorId VARCHAR(36) NOT NULL,
        eventId VARCHAR(36) NOT NULL,
        status ENUM('SUBMITTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'ALLOCATED', 'DISPATCHED', 'DELIVERED') DEFAULT 'SUBMITTED',
        note TEXT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (creatorId) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
        INDEX idx_creatorId (creatorId),
        INDEX idx_eventId (eventId),
        INDEX idx_status (status)
      )
    `);

    // Donation Items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS donation_items (
        id VARCHAR(36) PRIMARY KEY,
        donationId VARCHAR(36) NOT NULL,
        category VARCHAR(100) NOT NULL,
        quantity INT NOT NULL,
        \`condition\` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') DEFAULT 'GOOD',
        imageUrls JSON,
        note TEXT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (donationId) REFERENCES donations(id) ON DELETE CASCADE,
        INDEX idx_donationId (donationId)
      )
    `);

    // Warehouse Stocks
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse_stocks (
        id VARCHAR(36) PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        \`condition\` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NOT NULL,
        quantity INT DEFAULT 0,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY unique_category_condition (category, \`condition\`),
        INDEX idx_category (category)
      )
    `);

    // Warehouse Receipts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse_receipts (
        id VARCHAR(36) PRIMARY KEY,
        donationId VARCHAR(36) UNIQUE,
        createdById VARCHAR(36) NOT NULL,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        FOREIGN KEY (donationId) REFERENCES donations(id) ON DELETE SET NULL,
        FOREIGN KEY (createdById) REFERENCES accounts(id) ON DELETE CASCADE,
        INDEX idx_donationId (donationId),
        INDEX idx_createdById (createdById)
      )
    `);

    // Warehouse Receipt Items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse_receipt_items (
        id VARCHAR(36) PRIMARY KEY,
        receiptId VARCHAR(36) NOT NULL,
        category VARCHAR(100) NOT NULL,
        \`condition\` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NOT NULL,
        quantity INT NOT NULL,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (receiptId) REFERENCES warehouse_receipts(id) ON DELETE CASCADE,
        INDEX idx_receiptId (receiptId)
      )
    `);

    // Allocations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS allocations (
        id VARCHAR(36) PRIMARY KEY,
        teamId VARCHAR(36) NOT NULL,
        createdById VARCHAR(36) NOT NULL,
        status ENUM('CREATED', 'DISPATCHED', 'DELIVERED') DEFAULT 'CREATED',
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (createdById) REFERENCES accounts(id) ON DELETE CASCADE,
        INDEX idx_teamId (teamId),
        INDEX idx_createdById (createdById),
        INDEX idx_status (status)
      )
    `);

    // Allocation Items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS allocation_items (
        id VARCHAR(36) PRIMARY KEY,
        allocationId VARCHAR(36) NOT NULL,
        category VARCHAR(100) NOT NULL,
        \`condition\` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NOT NULL,
        quantity INT NOT NULL,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (allocationId) REFERENCES allocations(id) ON DELETE CASCADE,
        INDEX idx_allocationId (allocationId)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS allocation_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS allocations`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouse_receipt_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouse_receipts`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouse_stocks`);
    await queryRunner.query(`DROP TABLE IF EXISTS donation_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS donations`);
    await queryRunner.query(`DROP TABLE IF EXISTS rescue_assignments`);
    await queryRunner.query(`DROP TABLE IF EXISTS rescue_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS volunteer_registrations`);
    await queryRunner.query(`DROP TABLE IF EXISTS events`);
    await queryRunner.query(`DROP TABLE IF EXISTS teams`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS accounts`);
  }
}
