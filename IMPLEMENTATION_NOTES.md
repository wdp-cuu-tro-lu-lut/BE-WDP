# Implementation Notes

## Architecture Overview

### Layered Structure
- **Controllers**: HTTP endpoint handlers, DTO validation, response formatting
- **Services**: Business logic, entity relations, status transitions
- **Repositories**: Database queries via TypeORM Repository pattern
- **Entities**: TypeORM entity definitions with relations
- **DTOs**: Input/output validation and transformation
- **Guards/Decorators**: Authentication and authorization
- **Helpers**: Status transition validations, utility functions

### NestJS Best Practices Applied
✓ Modular architecture with feature-based organization
✓ Dependency injection for loose coupling
✓ Service encapsulation of business logic
✓ DTO-based validation with class-validator
✓ Guard-based role-based access control (RBAC)
✓ Global validation pipe with whitelist
✓ Structured error handling with custom exceptions

## Key Implementation Details

### 1. Authentication Flow
- Register: Create Account + Profile
- Login: Validate password, generate JWT access token + refresh token (stored in DB)
- Refresh: Validate refresh token from DB, issue new access token
- Logout: Mark refresh token as revoked (revokedAt)

**Security:**
- Password hashed with bcryptjs (10 rounds)
- Refresh tokens stored with hash (not plaintext)
- Access token validation via JwtStrategy (Passport.js)

### 2. Role-Based Access Control (RBAC)
- Roles: USER, RESCUE_TEAM, STAFF, ADMIN
- @Roles(AccountRole.ADMIN) decorator sets metadata
- RolesGuard checks request.user.role against metadata
- Applied at method level for fine-grained control

Example:
```typescript
@Roles(AccountRole.ADMIN, AccountRole.STAFF)
@UseGuards(JwtAuthGuard, RolesGuard)
async approveRequest(...) { }
```

### 3. Status Transitions
- Defined in `rescue/helpers/status.helper.ts`
- RescueStatusTransition.isValidTransition(from, to)
- Services enforce transitions before state change
- Prevents invalid state combinations

Example Rescue Request states:
```
NEW → REVIEWED → ASSIGNED → ACCEPTED → IN_PROGRESS → DONE
       ↓                      ↓
    CANCELED              REJECTED
```

### 4. Rescue Assignment Logic
- One-to-many assignments per request (parallel assignment strategy)
- When team ACCEPTS: auto-cancel other SENT assignments
- Updates rescue request status to ACCEPTED
- Team updates progress until completion

### 5. Warehouse Transactions with Pessimistic Locking
**Receipt Creation (Donation → Stock):**
```typescript
queryRunner.startTransaction()
  Create WarehouseReceipt
  For each donation item:
    Create WarehouseReceiptItem
    Find WarehouseStock (or create)
    Increment stock quantity
  Update Donation status → RECEIVED
queryRunner.commitTransaction()
```

**Allocation (Stock → Team):**
```typescript
queryRunner.startTransaction('PESSIMISTIC_WRITE')
  For each item:
    Lock WarehouseStock with pessimistic_write
    Validate sufficient quantity
  Create Allocation
  For each item:
    Create AllocationItem
    Decrement stock quantity
queryRunner.commitTransaction()
```

**Why Pessimistic Write Lock?**
- Multiple allocation requests could race condition on same stock
- Lock prevents two requests deducting same quantity
- Only one transaction can proceed at a time for same stock row

### 6. Pagination Pattern
All list endpoints return:
```json
{
  "data": [...items...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

Implemented via:
```typescript
const total = await qb.getCount();
const skip = (page - 1) * limit;
const items = await qb.skip(skip).take(limit).getMany();
```

### 7. Validation Pipeline
- Global ValidationPipe with:
  - `whitelist: true` - Remove unknown properties
  - `forbidNonWhitelisted: true` - Throw on unknown properties
  - `transform: true` - Auto-convert types
- Applied at `main.ts`: `app.useGlobalPipes(GlobalValidationPipe)`
- Each endpoint has typed DTO with class-validator decorators

### 8. File Upload Implementation
- Multer storage: disk storage with random filename + original extension
- File size limit: 50MB
- Allowed MIME types: images + PDFs + Office docs (configurable)
- Files saved to `./uploads` directory
- Endpoint returns: `{ url, filename, mimetype, size }`
- Static serving: `app.use('/uploads', express.static(uploadDir))`

### 9. Entity Relationships

**One-to-One:**
- Account ↔ Profile (cascading)

**One-to-Many:**
- Account → RescueRequests
- Account → VolunteerRegistrations
- Account → Donations
- Team → RescueAssignments
- Team → Allocations
- Event → VolunteerRegistrations
- Event → Donations
- Donation → DonationItems
- RescueRequest → RescueAssignments
- RescueRequest → Allocations (via AllocationItem)
- Allocation → AllocationItems
- WarehouseReceipt → WarehouseReceiptItems

**Unique Constraints:**
- Account: email (nullable), phone (nullable)
- VolunteerRegistration: (eventId, accountId)
- RescueAssignment: (rescueRequestId, teamId)
- WarehouseStock: (category, condition)
- WarehouseReceipt: donationId (nullable, one receipt per donation)

### 10. Query Building Examples

**Complex Query with Filters:**
```typescript
let qb = this.rescueRepository.createQueryBuilder('rescue')
  .leftJoinAndSelect('rescue.assignments', 'assignments');

if (status) qb = qb.where('rescue.status = :status', { status });
if (priority) qb = qb.andWhere('rescue.priority = :priority', { priority });
if (q) qb = qb.andWhere('rescue.address LIKE :q', { q: `%${q}%` });

const total = await qb.getCount();
const data = await qb
  .orderBy('rescue.createdAt', 'DESC')
  .skip((page - 1) * limit)
  .take(limit)
  .getMany();
```

## Database Considerations

### Indices for Performance
- Email, phone (unique)
- Role, isActive (frequent filtering)
- Status, priority (filtering)
- Timestamps (sorting)
- Foreign keys (joins)
- Composite indices: (category, condition) for warehouse

### Charset & Collation
- UTF8MB4 for full Unicode support
- Allows emoji and special characters in names/descriptions

### JSON Fields
- `DonationItem.imageUrls` stored as JSON array
- `AuditLog.metadata` (if implemented) as JSON object
- MySQL JSON type for flexible schema

### Timezone Handling
- All timestamps in UTC (DATETIME type)
- Application converts to user timezone as needed
- Use `createdAt` and `updatedAt` for audit trails

## Testing Recommendations

### Unit Tests (Services)
- Mock repositories
- Test business logic (status transitions, validations)
- Test error cases

### Integration Tests
- Use test database
- Test full request → service → database flow
- Verify transactions rollback on error

### E2E Tests
- Use docker-compose for database
- Test complete workflows (create → approve → receipt → allocate)
- Test concurrent allocations (pessimistic lock behavior)

## Production Deployment

### Pre-deployment Checklist
- [ ] Change JWT secrets in .env
- [ ] Set DB credentials securely
- [ ] Enable HTTPS in reverse proxy
- [ ] Set NODE_ENV=production
- [ ] Configure file upload directory with proper permissions
- [ ] Set up database backups
- [ ] Enable CORS appropriately
- [ ] Configure file size limits
- [ ] Review error handling (don't expose stack traces)

### Environment Variables
```
NODE_ENV=production
DB_HOST=rds-endpoint
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${SECURE_SECRET}
JWT_REFRESH_SECRET=${SECURE_REFRESH_SECRET}
APP_PORT=3000
UPLOAD_DIR=/var/uploads
```

### Scaling Considerations
- Separate read/write database replicas
- Cache frequently accessed data (Redis)
- Use message queue for async operations
- Horizontal scaling via load balancer
- CDN for file uploads

## Extending the System

### Adding New Features
1. Create module in `src/feature-name`
2. Define entity in `database/entities`
3. Create migration for schema changes
4. Implement service with business logic
5. Create controller with endpoints
6. Register module in `app.module.ts`

### Example: Adding AuditLog
```typescript
// 1. Entity
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  actorId: string;
  
  @Column()
  action: string; // CREATE, UPDATE, DELETE
  
  @Column()
  entity: string; // RescueRequest, Donation, etc
  
  @Column()
  entityId: string;
  
  @Column('json')
  metadata: Record<string, any>;
  
  @CreateDateColumn()
  createdAt: Date;
}

// 2. Service integration
// In affected services, call auditLogService.log()
```

## Known Limitations & Future Improvements

### Current Limitations
- Single database instance (no replication)
- Synchronous file upload (no queue)
- No caching layer
- No comprehensive logging/monitoring
- Basic audit trail (manual integration needed)

### Suggested Enhancements
1. **Real-time Updates**: WebSocket for live assignment updates
2. **Notifications**: Email/SMS for status changes
3. **Analytics**: Dashboards for rescue statistics
4. **Map Integration**: Geo-spatial queries for nearby rescues
5. **Payment**: Integration for donation processing
6. **Mobile App**: React Native client
7. **Two-Factor Auth**: Additional security layer
8. **Rate Limiting**: Prevent abuse
9. **API Versioning**: /api/v1/, /api/v2/
10. **Caching**: Redis for user profiles, popular events

## Troubleshooting

### Migration Issues
```bash
# Roll back last migration
npm run migration:revert

# Generate fresh migration after entity changes
npm run migration:generate -- src/migrations/YourMigration
```

### Database Connection Issues
- Verify .env credentials match MySQL setup
- Check MySQL is running: `mysql -u root -p`
- Verify database exists: `show databases;`
- Check character set: `ALTER DATABASE rescue_relief_db CHARACTER SET utf8mb4;`

### JWT Issues
- Token expired: Use refresh endpoint
- Invalid token: Re-login
- Missing token: Ensure Authorization header is set

### Pessimistic Lock Timeout
- Increase transaction timeout in ormconfig
- Check for deadlocks in MySQL logs
- Ensure allocation requests are not creating circular locks

## Code Style & Conventions

### Naming Conventions
- Entities: PascalCase (User, RescueRequest)
- DTOs: PascalCase + `Dto` suffix (CreateUserDto)
- Services: `serviceName.service.ts`
- Controllers: `serviceName.controller.ts`
- Enums: PascalCase (AccountRole, RescueStatus)

### Folder Organization
- Feature folder groups: entity, dto, service, controller
- All module imports at top level
- Shared utilities in `common/`
- Database artifacts in `database/`

### Code Comments
- Document complex business logic
- Explain why, not what (code shows what)
- Add comments for non-obvious optimizations
- Mark TODO items with reasoning

---

**Last Updated**: January 2026
**Version**: 1.0.0
