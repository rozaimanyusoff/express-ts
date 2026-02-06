# Utilities Reference Guide

Complete documentation of all utility modules in the Express TypeScript backend, including their purposes and usage across the codebase.

## Table of Contents

1. [Core Infrastructure](#core-infrastructure)
2. [Error Handling & Logging](#error-handling--logging)
3. [Database & Caching](#database--caching)
4. [File Management](#file-management)
5. [Communication & Notifications](#communication--notifications)
6. [Business Logic Helpers](#business-logic-helpers)
7. [Email Templates](#email-templates)
8. [Attachment Templates](#attachment-templates)
9. [Summary Table](#summary-table)
10. [Installation & Configuration](#installation--configuration)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)
13. [Recent Changes](#recent-changes-february-2026)
14. [Version History](#version-history)
15. [Future Enhancements](#future-enhancements)

---

## Core Infrastructure

### 1. **asyncHandler.ts**

**Location:** `src/utils/asyncHandler.ts`

**Purpose:**
Wraps async route handlers to catch errors and pass them to Express error handling middleware.

**Type:** Middleware Wrapper

**Key Functions:**
- `asyncHandler(fn)` - Wraps async function and catches promise rejections

**Usage Pattern:**
```typescript
router.get('/endpoint', asyncHandler(controller.method));
```

**Used By:**
- All route definitions across modules (100+ occurrences)
- Core modules: billing, notification, maintenance, asset, user, compliance, purchase, etc.
- Examples: `p.billing/billingRoutes.ts`, `p.notification/notificationRoutes.ts`, `p.jobbank/jobreposRoutes.ts`

**Benefits:**
- Eliminates try-catch boilerplate in route handlers
- Ensures all async errors are caught
- Prevents unhandled promise rejections

---

### 2. **socketIoInstance.ts**

**Location:** `src/utils/socketIoInstance.ts`

**Purpose:**
Global Socket.IO instance management for real-time event emission across the application.

**Key Functions:**
- `setSocketIOInstance(io)` - Registers Socket.IO instance (called from `server.ts`)
- `getSocketIOInstance()` - Retrieves Socket.IO instance for event emission

**Type:** Singleton Manager

**Used By:**
- `src/server.ts` - Initializes Socket.IO and sets instance
- `src/utils/notificationService.ts` - Emits maintenance status updates
- `src/p.billing/billingController.ts` - Emits fleet card events
- Real-time features requiring WebSocket connection

**Usage:**
```typescript
const io = getSocketIOInstance();
io.emit('mtn:new-request', { requestId, timestamp });
```

**Benefits:**
- Centralized Socket.IO access from any module
- Event-driven real-time updates
- Badge count and status synchronization

---

## Error Handling & Logging

### 3. **logger.ts**

**Location:** `src/utils/logger.ts`

**Purpose:**
Winston-based logging utility for error tracking and debugging.

**Dependencies:**
- `winston` - Logging framework

**Key Functions:**
- `logger.error(message)` - Log error level
- `logger.info(message)` - Log info level
- `logger.warn(message)` - Log warning level
- `logger.debug(message)` - Log debug level

**Type:** Error/Activity Logger

**Configuration:**
- Log level: `error` (production minimum)
- Transports:
  - Console (colorized, development-friendly)
  - File: `error.log` (plain text format)
- Timestamp format: `YYYY-MM-DD HH:mm:ss`

**Used By:**
- All modules for error logging
- `src/server.ts` - Socket.IO and startup logs
- `src/p.admin/logModel.ts` - User activity logging
- `src/p.notification/notificationController.ts` - Request error tracking
- `src/p.billing/billingController.ts` - Transaction logging
- Total: 50+ files across the codebase

**Usage:**
```typescript
import logger from '../utils/logger';
logger.error('Database connection failed', error);
logger.info('Request processed successfully');
```

**Benefits:**
- Centralized error tracking
- File-based persistence for audit trails
- Colorized console output for development
- Consistent timestamp formatting

---

### 4. **fileAuthLogger.ts**

**Location:** `src/utils/fileAuthLogger.ts`

**Purpose:**
File-based authentication activity logging in JSONL format (one JSON object per line) for compliance and audit trails.

**Key Functions:**
- `logAuthActivityToFile(entry)` - Append auth event to daily log file
- `getTodayAuthLogs()` - Retrieve today's auth activity
- `getUserTodayAuthLogs(userId)` - Get specific user's today activities

**Type:** Audit Logger

**Log Structure:**
```json
{
  "user_id": 123,
  "action": "login|logout|password_change",
  "status": "success|fail",
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "details": "Additional context",
  "created_at": "2026-02-06T10:30:00Z"
}
```

**Storage:**
- Location: `{UPLOAD_BASE_PATH}/logs/auth/auth_YYYY-MM-DD.jsonl`
- Daily rotation by filename

**Used By:**
- `src/p.admin/logModel.ts` - Authentication event tracking
- Auth module (login/logout events)
- Compliance and security audits

**Usage:**
```typescript
await logAuthActivityToFile({
  user_id: 123,
  action: 'login',
  status: 'success',
  ip: req.ip,
  user_agent: req.get('user-agent'),
  details: 'Successful login via portal',
  created_at: new Date().toISOString()
});
```

**Benefits:**
- Compliance-ready audit trail
- Lightweight JSONL format
- Daily log file organization
- Separate from database transactions

---

### 5. **tokenBlacklist.ts**

**Location:** `src/utils/tokenBlacklist.ts`

**Purpose:**
In-memory JWT token blacklist for logout functionality. Prevents session hijacking through invalidated tokens.

**Type:** Session Management

**Key Functions:**
- `addToBlacklist(token, expiresAt)` - Blacklist a token on logout
- `isTokenBlacklisted(token)` - Check if token is blacklisted
- `getBlacklistStats()` - Get monitoring stats
- Automatic cleanup every 5 minutes for expired tokens

**Usage:**
```typescript
// On logout
addToBlacklist(token, expiresAt);

// In middleware
if (isTokenBlacklisted(token)) {
  return res.status(401).json({ error: 'Token has been revoked' });
}
```

**Storage:**
- In-memory Map structure
- Default expiration: 1 hour after logout
- Auto-cleanup removes expired entries

**Used By:**
- Authentication routes (logout endpoint)
- `tokenValidator` middleware
- Session management system

**Limitations:**
- Single-server deployment only
- Not suitable for distributed systems
- For horizontal scaling, use Redis-backed implementation

**Benefits:**
- Immediate session termination on logout
- Simple, lightweight alternative to database queries
- Automatic memory cleanup

---

## Database & Caching

### 6. **db.ts**

**Location:** `src/utils/db.ts`

**Purpose:**
MySQL connection pool configuration and management for dual database support (main and secondary).

**Type:** Database Connection Manager

**Exports:**
- `pool` - Primary database connection pool
- `pool2` - Secondary database connection pool

**Configuration:**
- Connection pooling: 10 connections per pool
- Acquire timeout: 10 seconds
- Connect timeout: 10 seconds
- Query timeout: 30 seconds
- Keep-alive enabled for health persistence
- Idle timeout: 60 seconds

**Environment Variables:**
```bash
# Primary Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=adms

# Secondary Database
DB2_HOST=localhost
DB2_PORT=3306
DB2_USER=root
DB2_PASSWORD=password
DB2_NAME=secondary_db
```

**Used By:**
- All model files across modules (100+ files)
- Examples:
  - `src/p.billing/billingModel.ts`
  - `src/p.maintenance/maintenanceModel.ts`
  - `src/p.asset/assetModel.ts`
  - `src/p.user/userModel.ts`
  - `src/jobs/processAssetTransfers.ts`

**Usage Pattern:**
```typescript
import { pool, pool2 } from '../utils/db';

const [rows] = await pool.query('SELECT * FROM applications');
const [results] = await pool2.query('SELECT * FROM secondary_table');
```

**Benefits:**
- Connection pooling prevents connection exhaustion
- Automatic keep-alive for network stability
- Timeout protection prevents query hangs
- Dual database for distributed data or failover

---

### 7. **redisConfig.ts**

**Location:** `src/utils/redisConfig.ts`

**Purpose:**
Centralized Redis configuration management with feature toggle support.

**Type:** Configuration Manager

**Key Settings:**
- **enabled** - Feature toggle (default: `true`, set to `false` to disable)
- **host** - Redis server hostname (default: `localhost`)
- **port** - Redis port (default: `6379`)
- **password** - Redis password (optional)
- **db** - Database selection (default: `0`)

**Environment Variables:**
```bash
REDIS_ENABLED=true              # Toggle caching on/off
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password
REDIS_DB=0
```

**Used By:**
- `src/utils/redis.ts` - Initializes Redis client
- `src/utils/cacheService.ts` - Cache operations

**Usage:**
```typescript
import redisConfig from '../utils/redisConfig';

if (redisConfig.enabled) {
  // Use Redis
} else {
  // Use fallback (no-op cache)
}
```

**Benefits:**
- Feature toggle prevents breaking changes
- Easy disable for development/testing
- Centralized configuration management

---

### 8. **redis.ts**

**Location:** `src/utils/redis.ts`

**Purpose:**
Redis client initialization with automatic dummy fallback for disabled cache scenarios.

**Type:** Cache Client

**Key Features:**
- Conditional initialization based on `redisConfig.enabled`
- DummyRedis implementation for no-op when disabled
- All Redis methods supported: `setex`, `get`, `del`, `keys`, `exists`, etc.

**Usage:**
```typescript
import redis from '../utils/redis';

await redis.setex('key', 3600, JSON.stringify(data));
const data = await redis.get('key');
```

**Benefits:**
- Graceful degradation when Redis unavailable
- No code changes needed to disable caching
- Proper error logging for failures

---

### 9. **cacheService.ts**

**Location:** `src/utils/cacheService.ts`

**Purpose:**
High-level caching interface that wraps Redis with type-safe operations and automatic TTL management.

**Type:** Cache Abstraction Layer

**Key Functions:**
- `isEnabled()` - Check if caching is active
- `set(key, value, ttl=3600)` - Cache with expiration (default 1 hour)
- `get<T>(key)` - Retrieve and parse cached data
- `del(key)` - Delete specific cache entry
- `delPattern(pattern)` - Delete all keys matching pattern

**Type Safety:**
- Generic `get<T>` for type-safe retrieval
- Automatic JSON serialization/deserialization

**Error Handling:**
- Graceful failure - returns null on cache miss/error
- Prevents cache failures from breaking application
- Logs errors but doesn't throw

**Used By:**
- Asset caching workflows
- Performance optimization for repeated queries
- Cache invalidation strategies

**Usage:**
```typescript
import { cacheService } from '../utils/cacheService';

// Cache data for 1 hour
await cacheService.set('assets:123', assetData, 3600);

// Retrieve with type safety
const cached = await cacheService.get<Asset>('assets:123');

// Delete all asset-related cache
await cacheService.delPattern('assets:*');
```

**Benefits:**
- Type-safe caching operations
- Automatic expiration management
- Pattern-based bulk invalidation
- Graceful fallback to no-cache

---

### 10. **cacheInvalidation.ts**

**Location:** `src/utils/cacheInvalidation.ts`

**Purpose:**
Standardized cache invalidation for asset-related operations to prevent stale data.

**Type:** Cache Management Helper

**Key Functions:**
- `invalidateAssetCache()` - Clear all asset-related cache keys

**Usage:**
```typescript
import invalidateAssetCache from '../utils/cacheInvalidation';

// After asset creation, update, or deletion
await invalidateAssetCache();
```

**Used By:**
- Asset creation handlers
- Asset update handlers
- Asset deletion handlers

**Benefits:**
- Consistent cache invalidation strategy
- Prevents data inconsistency
- Centralized invalidation patterns

---

### 11. **dbHealthCheck.ts**

**Location:** `src/utils/dbHealthCheck.ts`

**Purpose:**
Database connection health monitoring with latency measurement for both connection pools.

**Type:** Monitoring Utility

**Key Functions:**
- `checkDatabaseHealth()` - Test both pools with timeout protection
- `broadcastHealthStatus(io, result)` - Emit health status via Socket.IO
- Scheduled health checks (configurable interval)

**Returns:**
```typescript
{
  pool1: {
    connected: boolean,
    latency?: number,     // ms
    error?: string
  },
  pool2: {
    connected: boolean,
    latency?: number,     // ms
    error?: string
  },
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: string,
  uptime: number,
  message?: string
}
```

**Health Status:**
- **healthy** - Both pools connected
- **degraded** - One pool connection failed
- **unhealthy** - Both pools disconnected

**Used By:**
- Server startup (validates connections before starting)
- Monitoring/health check endpoints
- Real-time status broadcasting via Socket.IO

**Usage:**
```typescript
const health = await checkDatabaseHealth();
if (health.status === 'healthy') {
  console.log('✅ Database connections OK');
}
```

**Timeout:** 5 seconds per database query

**Benefits:**
- Prevents startup without database connectivity
- Real-time monitoring for operations teams
- Latency tracking for performance analysis

---

## File Management

### 12. **fileUploader.ts**

**Location:** `src/utils/fileUploader.ts`

**Purpose:**
Multer-based file upload handler with MIME type validation and dynamic storage configuration.

**Type:** File Handler Middleware

**Key Functions:**
- `createUploader(subfolder, allowedMimeTypes?)` - Create configured multer instance

**Supported MIME Types:**
- Images: JPEG, PNG, GIF, WebP, SVG
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
- Archives: ZIP, RAR

**Storage Configuration:**
- Dynamic destination based on `subfolder` parameter
- Recursive directory creation
- File system error handling

**Usage:**
```typescript
const upholder = createUploader('assets/documents');
router.post('/upload', uploader.single('file'), controllerMethod);
```

**Used By:**
- `src/p.billing/billingRoutes.ts` - Beneficiary logo uploads
- Various modules requiring file attachments
- Invoice and document uploads

**Benefits:**
- Prevents arbitrary file uploads
- Organized storage by module
- Automatic directory creation
- Error logging and handling

---

### 13. **uploadUtil.ts**

**Location:** `src/utils/uploadUtil.ts`

**Purpose:**
File path utilities for upload directory management and public URL generation.

**Type:** Path Management Utility

**Key Functions:**
- `getUploadBaseSync()` - Synchronously get base upload directory
- `getUploadBase()` - Asynchronously get base upload directory
- `buildStoragePath(moduleDir, filename)` - Build absolute storage path
- `toPublicUrl(filePath)` - Convert storage path to public-accessible URL
- `normalizeDatabasePath(absolutePath)` - Normalize for database persistence
- `denormalizeDatabasePath(storagePath)` - Convert back to absolute path

**Environment Variable:**
```bash
UPLOAD_BASE_PATH=/uploads  # Container style, or project-relative ./uploads
```

**Directory Fallback:**
- Prefers `UPLOAD_BASE_PATH` environment variable
- Falls back to `{project}/uploads` if permission denied
- Handles permission errors gracefully

**Usage:**
```typescript
import { getUploadBase, toPublicUrl } from '../utils/uploadUtil';

const base = await getUploadBase();
const publicUrl = toPublicUrl('assets/doc/123.pdf');
// Results: /uploads/assets/doc/123.pdf
```

**Used By:**
- `src/p.billing/billingController.ts` - Get file URLs
- File storage operations across modules
- Database path normalization

**Benefits:**
- Unified upload directory management
- Public URL generation for client access
- Environment-aware fallback
- Path normalization for database storage

---

## Communication & Notifications

### 14. **mailer.ts**

**Location:** `src/utils/mailer.ts`

**Purpose:**
Email sending utility using Nodemailer with SMTP configuration.

**Type:** Email Service

**Dependencies:**
- `nodemailer` - SMTP client

**Key Functions:**
- `sendMail(to, subject, html, options?)` - Send email with HTML template

**Configuration:**
```typescript
interface MailOptions {
  attachments?: Array<{
    filename: string;
    path: string;
    contentType?: string;
  }>;
  cc?: string;
  text?: string;
}
```

**Environment Variables:**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=sender@example.com
EMAIL_PASS=app_password
```

**Usage:**
```typescript
import { sendMail } from '../utils/mailer';

await sendMail(
  'recipient@example.com',
  'Subject',
  '<p>HTML body</p>',
  {
    text: 'Plain text fallback',
    cc: 'cc@example.com',
    attachments: [{ filename: 'file.pdf', path: '/path/to/file' }]
  }
);
```

**Used By:**
- `src/p.billing/billingController.ts` - Fleet card notifications
- Asset transfer workflows
- Password reset flows
- Maintenance approval workflows
- 30+ email operations across modules

**Features:**
- Backward compatible API
- Automatic sender name "ADMS"
- Support for CC and attachments
- Plain text fallback

**Benefits:**
- SMTP-based email (no API dependency)
- Support for attachments
- Error logging with message ID tracking

---

### 15. **notificationService.ts**

**Location:** `src/utils/notificationService.ts`

**Purpose:**
Real-time notification system using Socket.IO for maintenance request lifecycle tracking.

**Type:** Event Emission Service

**Key Functions:**
- `notifyNewMtnRequest(requestId, ramcoId?)` - Emit new request with badge count
- `notifyMtnRequestUpdate(requestId, action, adminRamco?)` - Emit status change
- `notifyMtnRequestUnseen(requestId)` - Unseen request notification
- `notifyVehicleWsAssignment(...)`  - Workshop assignment

**Events Emitted:**
```typescript
io.emit('mtn:new-request', {
  message: 'New maintenance request submitted',
  requester: ramcoId,
  requestId,
  timestamp: ISO
});

io.emit('mtn:badge-count', {
  count: number,
  timestamp: ISO,
  type: 'new-request|approved|rejected'
});
```

**Usage:**
```typescript
import { notifyNewMtnRequest } from '../utils/notificationService';

// After maintenance request creation
await notifyNewMtnRequest(requestId, userRamcoId);
```

**Used By:**
- Maintenance module for real-time updates
- Admin dashboard badge counts
- Status change notifications

**Benefits:**
- Real-time notification delivery
- Badge count synchronization
- Error-safe (doesn't crash if Socket.IO unavailable)
- Centralized emission logic

---

### 16. **webhook.ts**

**Location:** `src/utils/webhook.ts`

**Purpose:**
HTTP webhook utility for posting JSON payloads to external services.

**Type:** Integration Utility

**Key Functions:**
- `sendWebhook(url, payload, options?)` - POST JSON to URL

**Options:**
```typescript
interface SendWebhookOptions {
  fireAndForget?: boolean;  // Don't wait for response
  headers?: Record<string, string>;
}
```

**Usage:**
```typescript
import sendWebhook from '../utils/webhook';

// Wait for completion
await sendWebhook('https://api.example.com/hook', {
  eventType: 'asset_transferred',
  assetId: 123
});

// Fire and forget
await sendWebhook('https://api.example.com/hook', data, {
  fireAndForget: true
});
```

**Features:**
- Automatic Content-Type header
- Custom headers support
- Fire-and-forget mode for non-blocking calls
- Error logging

**Benefits:**
- External system integration
- Non-blocking async operations
- Flexible header customization

---

## Business Logic Helpers

### 17. **employeeHelper.ts**

**Location:** `src/utils/employeeHelper.ts`

**Purpose:**
Employee directory lookup utilities for hierarchical relationships.

**Type:** Business Logic Helper

**Key Functions:**
- `getSupervisorBySubordinate(subordinateRamcoId)` - Get supervisor via employee hierarchy

**Returns:**
```typescript
{
  email: string,
  full_name: string
} | null
```

**Used By:**
- Asset transfer workflows (notify supervisor)
- Approval chain workflows
- Hierarchical notification routing

**Benefits:**
- Centralized supervisor lookup
- Filters for valid email addresses
- Error-safe fallback to null

---

### 18. **maintenanceResolver.ts**

**Location:** `src/utils/maintenanceResolver.ts`

**Purpose:**
Resolves maintenance request records by fetching and joining related data from multiple sources.

**Type:** Data Resolution Helper

**Key Functions:**
- `resolveVehicleMtnRecord(id)` - Fetch record and resolve all relationships

**Resolution Process:**
1. Fetch base maintenance record
2. Parallel fetch of referenced data:
   - Assets, Categories, Brands, Models
   - Cost centers, Departments, Locations
   - Workshops, Employees, Service Types
3. Map all foreign keys to actual objects
4. Return flattened structure

**Returns:**
```typescript
{
  id, req_date, requester: { name, email, ramco_id },
  asset: { id, register_number, brand, model, age_years },
  costcenter: { id, name },
  location: { id, name },
  svc_type: [{ id, name }],
  approval_by: { name, ramco_id },
  // ... more resolved fields
}
```

**Used By:**
- Email template builders
- Form pre-population
- Report generation
- Detailed view displays

**Benefits:**
- Single function for complete data resolution
- Parallel data fetching for performance
- Handles missing/null references gracefully
- Consistent data structure

---

### 19. **maintenanceEmailHelper.ts**

**Location:** `src/utils/maintenanceEmailHelper.ts`

**Purpose:**
Build email content sections for maintenance request lifecycle notifications.

**Type:** Email Content Generator

**Key Functions:**
- `buildSectionsForRecord(record)` - Generate email sections with request details

**Generated Sections:**
- Applicant information (name, RAMCO ID, contact)
- Department and location
- Vehicle information (registration, brand, model, age)
- Request type details
- Formatted dates
- Annual summary (costs + request counts)
- Recent requests (last 5 years per asset)

**Used By:**
- `src/utils/workflowService.ts` - Approval emails
- Maintenance outcome notifications
- Request detail emails

**Benefits:**
- Consistent email formatting
- Rich context in notifications
- Historical data summaries
- Multi-year trend analysis

---

### 20. **workflowHelper.ts**

**Location:** `src/utils/workflowHelper.ts`

**Purpose:**
Resolve workflow approvers/PIC (Person In Charge) by module and level with email resolution.

**Type:** Workflow Resolution

**Key Functions:**
- `getWorkflowPic(moduleName, levelName)` - Get PIC for workflow stage

**Resolution Process:**
1. Fetch workflows from user model
2. Find matching module + level (case-insensitive)
3. Prefer active workflows
4. Resolve RAMCO ID to employee directory
5. Extract email and full name

**Returns:**
```typescript
{
  ramco_id: string,
  email?: string | null,
  full_name?: string | null
} | null
```

**Used By:**
- `src/utils/workflowService.ts` - Send approval emails
- Workflow routing logic
- Multi-level approval chains

**Usage:**
```typescript
const approver = await getWorkflowPic('vehicle maintenance', 'Approval');
if (approver?.email) {
  await sendMail(approver.email, 'Approval Request', html);
}
```

**Benefits:**
- Flexible workflow configuration
- Case-insensitive matching
- Email resolution fallback
- Centralized PIC lookup

---

### 21. **workflowService.ts**

**Location:** `src/utils/workflowService.ts`

**Purpose:**
High-level workflow operations for maintenance request approval cycles and related email notifications.

**Type:** Business Process Service

**Key Functions:**
- `approveVehicleMtnRequest(reqId, approverRamco, status)` - Update approval status
- `recommendVehicleMtnRequest(reqId, recommenderRamco, status)` - Recommendation workflow
- `sendApprovalEmail(reqId)` - Generate and send approval request email
- `sendOutcomeEmail(reqId, status)` - Send approval outcome to requester

**Workflow Steps:**
1. Resolve complete record with all relationships
2. Get workflow PIC from configuration
3. Resolve Email address with fallbacks
4. Build email sections (applicant, vehicle, etc.)
5. Generate HTML template
6. Send authorization email with JWT link

**Token-Based Approval Links:**
- JWT signed approval URLs (3-day expiration default)
- `approveVehicleMtnRequest` endpoint pattern
- Stateless approval with audit trail

**Used By:**
- Maintenance module workflows
- Approval chain orchestration
- Email notification system

**Benefits:**
- Encapsulates complex workflow logic
- Multi-level approval support
- Audit trail through email send logs
- Token-secured approval links

---

### 22. **navBuilder.ts**

**Location:** `src/utils/navBuilder.ts`

**Purpose:**
Builds hierarchical navigation tree from flat array of navigation items.

**Type:** Data Structure Builder

**Key Functions:**
- `buildNavigationTree(flatNavItems)` - Convert flat to hierarchical structure

**Input Format:**
```typescript
[
  {
    navId: 1,
    title: 'Dashboard',
    type: 'section',
    parent_nav_id: null,
    path: '/dashboard',
    position: 1,
    status: 1,
    section_id: null
  }
]
```

**Output Format:**
```typescript
{
  navId: 1,
  title: 'Dashboard',
  type: 'section',
  parent_nav_id: null,
  children: [
    {
      navId: 2,
      title: 'Overview',
      type: 'item',
      parent_nav_id: 1,
      children: null
    }
  ]
}
```

**Features:**
- String-to-ID normalization
- Handle null/undefined parent references
- Type-safe structure building
- Validation of input format

**Used By:**
- Navigation menu generation
- Sidebar/breadcrumb construction
- Permission-aware menu filtering

**Benefits:**
- Single source of truth for navigation
- Flexible parent reference handling
- Recursive children nesting
- Type safety

---

### 23. **authLogger.ts**

**Location:** `src/utils/authLogger.ts`

**Purpose:**
File-based authentication activity logging with functions for retrieving user authentication history and time tracking.

**Type:** Authentication Logging Utility

**Key Functions:**
- `logAuthActivity(userId, action, status, reason?, req?)` - Log authentication events to file
- `getAuthLogs()` - Retrieve all authentication logs (sorted by date)
- `getUserAuthLogs(userId)` - Get specific user's authentication logs
- `getTimeSpentByUsers(userIds)` - Batch fetch time spent for multiple users

**Supported Auth Actions:**
```typescript
type AuthAction = 'activate' | 'login' | 'logout' | 'other' | 'register' | 'request_reset' | 'reset_password';
```

**Status Values:** `'success'` | `'fail'`

**Log Structure:**
```typescript
{
  user_id: number,
  action: AuthAction,
  status: 'success' | 'fail',
  ip: string | null,
  user_agent: string | null,
  details: string | null,
  created_at: ISO string
}
```

**Used By:**
- `src/p.auth/adms/authController.ts` - Auth lifecycle (register, login, logout, password reset)
- `src/p.user/userController.ts` - User management and auth logs retrieval
- `src/middlewares/rateLimiter.ts` - Rate limit tracking

**Usage:**
```typescript
import { logAuthActivity, getAuthLogs, getUserAuthLogs } from '../utils/authLogger';

// Log authentication event
await logAuthActivity(userId, 'login', 'success', {}, req);

// Retrieve logs (batched)
const logs = await getAuthLogs();
const userLogs = await getUserAuthLogs(userId);
```

**Benefits:**
- Centralized auth activity tracking
- Compliance-ready audit trail
- Batch user time tracking optimization
- IP and user-agent capture for security analysis

**Related:** Before relocation, these functions were in `src/p.admin/logModel.ts`

---

### 24. **notificationManager.ts**

**Location:** `src/utils/notificationManager.ts`

**Purpose:**
Real-time notification system with Socket.IO integration for user notifications and admin broadcasts.

**Type:** Notification Management Service

**Key Functions:**
- `getNotificationsByUser(userId, {limit, offset})` - Fetch paginated notifications for user
- `markNotificationsRead(userId, ids)` - Mark specific notifications as read
- `markAllRead(userId)` - Mark all user notifications as read
- `getUnreadCount(userId)` - Get count of unread notifications
- `createNotification({message, type, userId})` - Create notification and emit via Socket.IO
- `createAdminNotification({message, type})` - Create notification for all admin users

**Notification Interface:**
```typescript
interface Notification {
  message: string;
  type: string;
  userId: number;
}
```

**Features:**
- Real-time Socket.IO emission to user rooms (`user:{userId}`)
- Webhook integration for external notification systems (configurable via `NOTIFICATION_WEBHOOK_URL` env var)
- Fire-and-forget webhook delivery (doesn't block main flow)
- Automatic admin lookup for admin notifications

**Used By:**
- `src/p.notification/notificationController.ts` - Notification endpoints (get, mark read, unread count)
- `src/p.compliance/complianceController.ts` - Summons/compliance notifications
- `src/p.auth/adms/authController.ts` - User activation notifications

**Usage:**
```typescript
import { createNotification, getUnreadCount, markNotificationsRead } from '../utils/notificationManager';

// Create and emit notification
await createNotification({
  message: 'Your request has been approved',
  type: 'approval',
  userId: 123
});

// Get user's notifications (paginated)
const { rows, total } = await getNotificationsByUser(userId, { limit: 20, offset: 0 });

// Mark as read
await markNotificationsRead(userId, [1, 2, 3]);
```

**Environment Variables:**
```bash
NOTIFICATION_WEBHOOK_URL=https://external-service/webhooks/notifications  # Optional
```

**Benefits:**
- Unified notification system across modules
- Real-time updates via Socket.IO
- Graceful webhook integration without blocking
- Pagination support for large notification sets
- Admin broadcast capability

**Related:** Before relocation, these functions were in `src/p.admin/notificationModel.ts`

---

### 25. **stockAnalysis.ts**

**Location:** `src/utils/stockAnalysis.ts`

**Purpose:**
Generate analysis sections and summaries from stock tracking data with team and item-level aggregations.

**Type:** Data Analysis Helper

**Key Functions:**
- `generateStockAnalysis(data)` - Transform tracking data into comprehensive analysis

**Input:**
```typescript
interface StockTracking {
  issuance?: {
    issue_to?: { id: number; name: string };
  };
  items: { item_code: string; item_name: string };
  status: string;
}
```

**Output:**
```typescript
interface Analysis {
  stock: {
    total_available: number;
    total_defective: number;
    total_installed: number;
    total_issued: number;
    total_items: number;
    total_uninstalled: number;
  };
  teams: {
    available_count: number;
    defective_count: number;
    installed_count: number;
    issued_count: number;
    team_id: number;
    team_name: string;
    uninstalled_count: number;
  }[];
  top_5_items: {
    available_count: number;
    defective_count: number;
    installed_count: number;
    issued_count: number;
    item_code: string;
    item_name: string;
    uninstalled_count: number;
  }[];
}
```

**Status Values:** `'available'` | `'defective'` | `'installed'` | `'issued'` | `'uninstalled'`

**Used By:**
- `src/p.stock/rt/stockController.ts` - Stock analysis endpoint

**Usage:**
```typescript
import { generateStockAnalysis } from '../utils/stockAnalysis';

const analysisData = await fetchStockData(); // From database
const analysis = generateStockAnalysis(analysisData);
  
res.json({
  stock_summary: analysis.stock,
  team_breakdown: analysis.teams,
  top_items: analysis.top_5_items
});
```

**Benefits:**
- Efficient single-pass analysis
- Team and item aggregations in one operation
- Top 5 items sorting by issued count
- Type-safe data transformations

**Related:** Before relocation, this function was in `src/p.stock/rt/generateStockAnalysis.ts`

---

## Email Templates


### 23. **emailTemplates Directory**

**Location:** `src/utils/emailTemplates/`

**Purpose:**
Reusable HTML email template generators for various business workflows.

**Template Files:**

| Template | Purpose | Used By |
|----------|---------|---------|
| `accountActivated.ts` | New account activation confirmation | User registration |
| `accountActivation.ts` | Account activation link email | Admin user creation |
| `adminPincode.ts` | Admin PIN code delivery | Admin login |
| `assetTransferAssetManagerEmail.ts` | Asset transfer to asset manager | T1 stage |
| `assetTransferCurrentOwner.ts` | Current owner transfer notification | Asset workflow |
| `assetTransferItemFormat.ts` | Item format helper | Transfer emails |
| `assetTransferT1Submission.ts` | T1 submission stage | Transfer workflow |
| `assetTransferT2HodApprovalRequest.ts` | HOD approval request | T2 stage |
| `assetTransferT3HodDecision.ts` | HOD decision outcome | T3 stage |
| `assetTransferT4HodApproved.ts` | HOD approval confirmation | T4 stage |
| `assetTransferT5AwaitingAcceptance.ts` | Await new owner acceptance | T5 stage |
| `assetTransferT6HodRejected.ts` | Rejection notification | Rejection stage |
| `assetTransferT7TransferCompleted.ts` | Transfer completion | T7 final stage |
| `fleetCardCreated.ts` | New fleet card notification | Fleet card creation |
| `fleetCardUpdated.ts` | Fleet card update notification | Fleet card updates |
| `itAssessmentNotification.ts` | IT assessment notification | IT module |
| `passwordChanged.ts` | Password change confirmation | Auth module |
| `poolCarApplicant.ts` | Pool car application to applicant | Pool car module |
| `poolCarSupervisor.ts` | Pool car request to supervisor | Pool car approval |
| `purchaseNotification.ts` | Purchase order notification | Purchase module |
| `purchaseRegistryCompleted.ts` | Registry completion notification | Registry |
| `resetPassword.ts` | Password reset link email | Password recovery |
| `summonNotification.ts` | Summons/violation notification | Compliance module |
| `summonPaymentReceipt.ts` | Summons payment receipt | Payment confirmation |
| `vehicleAssessmentNotification.ts` | Assessment notification | Maintenance |
| `vehicleMaintenanceAuthorization.ts` | Maintenance approval request | Maintenance approval |
| `vehicleMaintenanceOutcome.ts` | Maintenance request outcome | Maintenance completion |
| `vehicleMaintenancePortal.ts` | Portal access link | Maintenance portal |
| `vehicleMaintenanceRequest.ts` | Request confirmation | Maintenance request |

**Usage Pattern:**
```typescript
import { renderFleetCardCreatedNotification } from '../utils/emailTemplates/fleetCardCreated';

const html = renderFleetCardCreatedNotification({
  cardNumber: '1234-5678',
  issuer: 'Shell',
  activationDate: '2026-02-06'
});

await sendMail(email, 'Fleet Card Created', html);
```

**Template Features:**
- HTML-only format (no plain text)
- Reusable component structure
- Branded ADMS header/footer
- Responsive design
- Dynamic data injection

**Benefits:**
- Consistent branding
- Reusable across modules
- Easy maintenance updates
- Type-safe data passing

---

## Attachment Templates

### 24. **attachmentTemplates Directory**

**Location:** `src/utils/attachmentTemplates/`

**Currently Includes:**
- `assessmentPdf.ts` - Assessment document generator

**Purpose:**
Generate attachment documents (PDFs, reports) for email and download.

**Usage:**
```typescript
import assessmentPdf from '../utils/attachmentTemplates/assessmentPdf';

const pdfBuffer = await assessmentPdf.generate(assessmentData);
```

**Benefits:**
- Automated document generation
- Consistent branding/templates
- Embeddable in emails as attachments

---

## Summary Table

| Utility | Type | Primary Purpose | Status |
|---------|------|-----------------|--------|
| asyncHandler.ts | Middleware | Error handling wrapper | Core |
| socketIoInstance.ts | Manager | Real-time events | Core |
| logger.ts | Logger | Error/activity logging | Core |
| fileAuthLogger.ts | Logger | Authentication audit | Core |
| tokenBlacklist.ts | Session | JWT invalidation on logout | Core |
| db.ts | Database | MySQL connections | Core |
| redisConfig.ts | Configuration | Cache settings | Core |
| redis.ts | Cache | Redis client | Core |
| cacheService.ts | Cache | Type-safe caching | Core |
| cacheInvalidation.ts | Cache | Pattern-based invalidation | Helper |
| dbHealthCheck.ts | Monitoring | Connection health | Ops/Monitoring |
| fileUploader.ts | File Handler | Multer wrapper | Core |
| uploadUtil.ts | File Handler | Path management | Core |
| mailer.ts | Email | SMTP email sending | Core |
| notificationService.ts | Events | Socket.IO emissions | Core |
| webhook.ts | Integration | HTTP webhooks | Integration |
| employeeHelper.ts | Business | Supervisor lookup | Helper |
| maintenanceResolver.ts | Business | Data resolution | Helper |
| maintenanceEmailHelper.ts | Business | Email content building | Helper |
| workflowHelper.ts | Business | Approver resolution | Helper |
| workflowService.ts | Business | Workflow operations | Core |
| navBuilder.ts | Business | Navigation building | Helper |
| authLogger.ts | Business | Auth activity logging | Core |
| notificationManager.ts | Business | User notifications | Core |
| stockAnalysis.ts | Business | Stock data analysis | Helper |
| emailTemplates/ | Templates | HTML email templates | Core |
| attachmentTemplates/ | Templates | Document generators | Integration |

---

## Installation & Configuration

### Prerequisites
```bash
npm install winston nodemailer ioredis multer socket.io mysql2
```

### Environment Setup
Create `.env` file:
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=adms
DB2_HOST=localhost
DB2_PORT=3306
DB2_USER=root
DB2_PASSWORD=password
DB2_NAME=secondary_db

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=sender@example.com
EMAIL_PASS=app_password

# Redis (optional)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# File Uploads
UPLOAD_BASE_PATH=./uploads
```

---

## Best Practices

### 1. **asyncHandler Usage**
- Always wrap async route handlers
- Never mix with try-catch (redundant)
- Errors automatically forwarded to error middleware

### 2. **Logger Usage**
- Use `logger.error()` for exceptions only
- Use `logger.info()` for key milestones
- Include context (user ID, request ID) when possible

### 3. **Database Connections**
- Use `pool` for primary database
- Use `pool2` for secondary/read replicas
- Never hold connections beyond request scope
- Check health before critical operations

### 4. **File Uploads**
- Always validate file MIME types
- Use unique storage paths per module
- Check available disk space before upload
- Validate file size limits

### 5. **Email Notifications**
- Use template files, not inline HTML
- Always include fallback plain text
- Log message IDs for tracking
- Verify SMTP credentials before production

### 6. **Cache Operations**
- Check `cacheService.isEnabled()` before relying on cache
- Always set appropriate TTL values
- Invalidate related cache keys on updates
- Use pattern-based invalidation sparingly (performance impact)

### 7. **Real-time Events**
- Always check if Socket.IO is initialized
- Don't throw on socket emit failures
- Include timestamps in events
- Use typed payloads

---

## Troubleshooting

### Common Issues

**Issue:** `Cannot find Socket.IO instance`
- Ensure `server.ts` calls `setSocketIOInstance(io)` on startup
- Check if Socket.IO is enabled in server configuration

**Issue:** Cache not working
- Check `REDIS_ENABLED` environment variable
- Verify Redis connection: `redis-cli ping`
- Check cache TTL values aren't too short

**Issue:** Email not sending
- Verify SMTP credentials in `.env`
- Check firewall allows SMTP port (usually 587)
- Enable "Less secure app access" for Gmail
- Check error.log for nodemailer error details

**Issue:** Database connection timeout**
- Check network connectivity to database server
- Verify credentials are correct
- Check if database server is running
- Monitor connection pool exhaustion

**Issue:** File upload refuses MIME type**
- Check if MIME type is in ALLOWED_MIME_TYPES
- Verify file isn't corrupted or invalid
- Use browser DevTools to inspect actual MIME type sent

---

## Recent Changes (February 2026)

### Utilities Relocation
Three utility-like functions from module directories have been relocated to `/src/utils/` for better code organization:

1. **authLogger.ts** - Relocated from `src/p.admin/logModel.ts`
   - Authentication activity logging functions
   - User time tracking queries
   - Auth logs retrieval

2. **notificationManager.ts** - Relocated from `src/p.admin/notificationModel.ts`
   - Real-time notification operations
   - Socket.IO integration for user notifications
   - Admin notification broadcasting

3. **stockAnalysis.ts** - Relocated from `src/p.stock/rt/generateStockAnalysis.ts`
   - Stock tracking data analysis
   - Team and item-level aggregations

**Impact:** All imports have been updated across consuming modules. Old files removed from module directories.

---

## Version History

- **Current:** February 2026
- All utilities production-tested
- Redis caching optional (graceful degradation)
- JWT token blacklist in-memory (single server)
- Recent: Relocated auth, notification, and stock analysis utilities from modules to /utils/

---

## Future Enhancements

1. **Redis Token Blacklist** - For distributed systems
2. **Email Queue** - For high-volume scenarios
3. **File Storage S3/Cloud** - For scalable storage
4. **Centralized Health Endpoint** - Expose all health checks
5. **Metrics/Analytics** - Track utility usage patterns
6. **Circuit Breaker** - For external service failures

---

Generated: 6 February 2026
Last Updated: Current Session
Workspace: `/Users/rozaiman/express-ts`
