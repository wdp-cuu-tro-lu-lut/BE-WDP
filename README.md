# Rescue & Relief API

RESTful API backend cho hệ thống Cứu hộ & Cứu trợ

## Technology Stack

- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **Database**: MySQL 8
- **ORM**: TypeORM
- **Auth**: JWT (access + refresh token)
- **Validation**: class-validator + class-transformer
- **API Docs**: Swagger/OpenAPI
- **File Upload**: Multer

## Project Structure

```
src/
├── auth/                 # Authentication (JWT, login, register)
├── me/                   # Current user profile endpoints
├── accounts/             # Account management (admin only)
├── teams/                # Team management (admin)
├── events/               # Events + volunteer registration
├── rescue/               # Rescue requests + assignments
├── donations/            # Donations + donation items
├── warehouse/            # Stock + receipt + allocation (with transaction lock)
├── files/                # File upload endpoints
├── database/
│   ├── entities/         # TypeORM entities
│   └── database.module.ts
├── common/
│   ├── decorators/       # Custom decorators (@Roles, @CurrentUser)
│   ├── guards/           # Auth guards (JWT, Roles)
│   ├── exceptions/       # Custom exceptions
│   ├── pipes/            # Global validation pipe
│   └── constants/        # Constants
├── app.module.ts
└── main.ts
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

**Key environment variables:**
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=rescue_relief_db

JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

APP_PORT=3000
UPLOAD_DIR=./uploads
```

### 3. Create MySQL Database

```sql
CREATE DATABASE rescue_relief_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run Migrations

```bash
# Generate migration from entities
npm run migration:generate -- src/migrations/InitialMigration

# Run migrations
npm run migration:run
```

### 5. Seed Database

```bash
# Compile TypeScript
npm run build

# Run seed script
npm run seed
```

**Seeded Accounts:**
- **Admin**: admin@example.com / admin123
- **Staff**: staff@example.com / staff123
- **Rescue Team**: team@example.com / team123
- **User**: user@example.com / user123

### 6. Start Development Server

```bash
npm run start:dev
```

Server runs on `http://localhost:3000`
API docs available at `http://localhost:3000/api/docs`

## Build & Production

```bash
# Build
npm run build

# Start production
npm run start:prod
```

## API Endpoints Overview

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

### User Profile
- `GET /me` - Get current user info
- `PUT /me` - Update profile

### Admin - Accounts
- `GET /admin/accounts` - List accounts
- `POST /admin/accounts` - Create account
- `PATCH /admin/accounts/:id` - Update account
- `PATCH /admin/accounts/:id/status` - Toggle active/inactive

### Admin - Teams
- `GET /admin/teams` - List teams
- `POST /admin/teams` - Create team
- `PATCH /admin/teams/:id` - Update team

### Events
- `GET /events` - List events (public)
- `POST /events` - Create event (ADMIN)
- `PATCH /events/:id/status` - Update status (ADMIN)
- `POST /events/:id/volunteer-registrations` - Register volunteer (USER)
- `GET /events/:id/volunteer-registrations` - View volunteers (STAFF/ADMIN)

### Rescue Requests
- `POST /rescue-requests` - Create request (USER)
- `GET /rescue-requests/mine` - My requests (USER)
- `GET /rescue-requests/:id` - View request
- `PATCH /rescue-requests/:id/cancel` - Cancel request (USER owner)
- `GET /admin/rescue-requests` - List requests (ADMIN/STAFF)
- `PATCH /admin/rescue-requests/:id/review` - Review request (ADMIN)
- `POST /admin/rescue-requests/:id/assignments` - Assign teams (ADMIN)

### Team Assignments
- `GET /team/assignments` - My assignments
- `PATCH /team/assignments/:id/respond` - Accept/decline
- `PATCH /team/assignments/:id/progress` - Update progress

### Donations
- `POST /events/:eventId/donations` - Create donation (USER)
- `GET /donations/mine` - My donations
- `GET /admin/donations` - List donations (ADMIN/STAFF)
- `PATCH /admin/donations/:id/approve` - Approve
- `PATCH /admin/donations/:id/reject` - Reject

### Warehouse
- `GET /warehouse/stocks` - List stocks
- `POST /warehouse/receipts` - Create receipt from donation
- `POST /warehouse/allocations` - Create allocation (with transaction lock)
- `GET /warehouse/allocations` - List allocations
- `PATCH /warehouse/allocations/:id/status` - Update allocation status

### Files
- `POST /files/upload` - Upload file (returns URL)

## Key Features

### 1. Authentication & Authorization
- JWT access token + refresh token (stored in DB)
- Role-based access control (RBAC) with `@Roles` guard
- Token revocation support

### 2. Status Transitions
- Rescue requests: NEW → REVIEWED → ASSIGNED → ACCEPTED → IN_PROGRESS → DONE
- Rescue assignments: SENT → ACCEPTED/DECLINED → CANCELED
- Donations: SUBMITTED → APPROVED/REJECTED → RECEIVED → ALLOCATED → DISPATCHED → DELIVERED
- Allocations: CREATED → DISPATCHED → DELIVERED

### 3. Rescue Request Management
- Users create rescue requests
- Admin reviews and assigns to teams
- Multiple teams can receive assignment; first to accept cancels others
- Team updates progress until completion

### 4. Warehouse with Pessimistic Locking
- Receipt creation from approved donations (transaction: update stock)
- Allocation with pessimistic write lock to prevent race conditions
- Stock tracking by category + condition

### 5. Validation & Error Handling
- Global validation pipe with whitelist
- Custom exception classes with standardized format
- Comprehensive error codes

### 6. Pagination
All list endpoints support:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### 7. File Upload
- POST /files/upload with multipart/form-data
- Supports images and documents (configurable MIME types)
- Files stored in `./uploads` directory
- Returns public URL `/uploads/{filename}`

## Database Schema

Key entities:
- `Account` - User accounts with role (USER, RESCUE_TEAM, STAFF, ADMIN)
- `Profile` - User profile info (one-to-one with Account)
- `Team` - Rescue teams
- `RescueRequest` - Rescue requests from users
- `RescueAssignment` - Assignment of teams to requests
- `Event` - Events (VOLUNTEER or DONATION type)
- `VolunteerRegistration` - User registrations for volunteer events
- `Donation` - Donations for relief operations
- `DonationItem` - Individual items in a donation
- `WarehouseStock` - Current inventory by category+condition
- `WarehouseReceipt` - Receipt when donation is added to stock
- `WarehouseReceiptItem` - Items added in a receipt
- `Allocation` - Distribution of items to teams
- `AllocationItem` - Items in an allocation
- `RefreshToken` - Stored refresh tokens (for revocation)

## Notes

- All timestamps (createdAt, updatedAt) are UTC
- Coordinates (latitude, longitude) stored as DECIMAL(10,8) and DECIMAL(11,8)
- JSON fields (imageUrls) stored as MySQL JSON type
- Pagination defaults: page=1, limit=20
- File upload max size: 50MB
- All responses include timestamp for audit trail
