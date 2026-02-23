# GitHub Copilot Instructions

Express TypeScript backend API (ESM, Node.js 22) for enterprise management — maintenance, billing, assets, telco, stock, compliance, and more.

## Commands

```bash
npm run dev          # Development with tsx --watch (src/server.ts)
npm run build        # tsc → dist/; postbuild injects .js extensions on imports
npm run type-check   # Type-check without emitting
npm run lint         # ESLint (TypeScript-ESLint strict + perfectionist)
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier format
```

No test suite is configured (`npm test` exits 1).

## Architecture

### Module Structure

Business domains live in `src/p.{domain}/` — each is a self-contained MVC triad:

```
src/p.newmodule/
├── newmoduleController.ts   # Request/response logic
├── newmoduleModel.ts        # All database queries
└── newmoduleRoutes.ts       # Router + middleware wiring
```

Active modules: `p.admin`, `p.asset`, `p.auth`, `p.billing`, `p.compliance`, `p.jobbank`, `p.maintenance`, `p.media`, `p.notification`, `p.project`, `p.purchase`, `p.stock` (subdirs: `nrw/`, `rt/`), `p.telco`, `p.training`, `p.user`. External service: `s.webstock/`.

Register new module routes in `src/app.ts`.

### Database

Dual MySQL connection pools exported from `src/utils/db.ts`:
- `pool` — primary DB (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`)
- `pool2` — secondary DB (`DB2_*` env vars)

Table references are declared at the top of each model file as fully-qualified strings:

```typescript
const dbMaintenance = 'applications';
const vehicleTable = `${dbMaintenance}.vehicle_svc`;
```

Use `src/utils/dbHealthCheck.ts` to monitor connection health; pools don't emit `error` events directly.

### ESM + Build

The project uses `"type": "module"`. Source uses extensionless imports (resolved via `"moduleResolution": "bundler"`). The `postbuild` script (`scripts/add-js-extensions.js`) rewrites imports in `dist/` to add `.js` extensions for Node.js ESM compatibility.

## Key Conventions

### Route Protection

`tokenValidator` middleware is applied per-route in `app.ts` — it is **not** a global guard. Several routes (e.g. `/api/users`, `/api/assets`) are intentionally unprotected. Always check `app.ts` before assuming a route is protected.

```typescript
app.use('/api/auth', authRoutes);                        // Public
app.use('/api/media', tokenValidator, mediaRoutes);      // Protected
```

`tokenValidator` verifies the JWT (`Authorization: Bearer <token>`), sets `req.user`, and supports optional single-session enforcement via `SINGLE_SESSION_ENFORCEMENT=true`.

### asyncHandler

All async route handlers must be wrapped — this forwards thrown errors to the Express error handler:

```typescript
router.get('/endpoint', asyncHandler(controller.method));
```

### Response Format

```typescript
// Success
res.json({ status: 'success', message: 'Done', data: result });

// Error
res.status(400).json({ status: 'error', message: 'Validation failed', data: null });
```

### File Uploads

Use `createUploader(subPath, mimeTypes?)` from `src/utils/fileUploader.ts`. Static files are served from `/uploads` → resolved path priority: `STATIC_UPLOAD_PATH` env → `/mnt/winshare` (if exists) → `getUploadBaseSync()`.

### Logging

Use Winston logger from `src/utils/logger.ts` (not `console.log`) for all server-side output.

### Caching

Optional Redis cache via `src/utils/cacheService.ts` and `createCacheMiddleware()`. Redis is opt-in: set `REDIS_ENABLED=true`. When disabled, caching is a no-op.

### Socket.IO

The `io` instance is set globally via `src/utils/socketIoInstance.ts` after server init. Controllers emit events via `getSocketIOInstance()`. Socket auth uses the same JWT + optional single-session check as HTTP.

### Scheduled Jobs

Background jobs live in `src/jobs/` (e.g., `processAssetTransfers.ts`, `cleanupExpiredPendingUsers.ts`). They are initialized in `src/server.ts` after successful DB connection.

### ESLint — perfectionist

The `eslint-plugin-perfectionist` enforces **natural sort order on imports**. When adding imports, keep them sorted alphabetically (natural order) — the linter will flag unsorted imports.

## Integration Points

- **Email**: Templates in `src/utils/emailTemplates/`, sent via `src/utils/mailer.ts` (SMTP via env vars)
- **Notifications**: `src/utils/notificationService.ts` + Socket.IO for real-time push
- **Workflows**: Approval/recommendation flows in `src/utils/workflowService.ts` + `workflowHelper.ts`
- **Cross-module imports**: Controllers freely import from other modules' models (e.g., `p.maintenance` imports `p.asset` and `p.billing` models)

## Documentation

All markdown files go in `/documentations` — never inside module folders or scattered across `src/`.

Each module gets exactly 4 files under `/documentations/{module}/`:

- **README.md** — overview, features, workflows, quick-start curl examples
- **SCHEMA.md** — `CREATE TABLE` SQL, TypeScript interfaces, key queries, sample data
- **API.md** — every endpoint with params, request body, success/error responses
- **ENHANCEMENTS.md** — feature deep-dives, ASCII workflow diagrams, future roadmap

**Do not create multiple markdown files covering the same topic, issue, or enhancement.** If content already exists in one of the 4 files, update it in place rather than creating a new file. Consolidate any existing stray markdowns into the appropriate file within `/documentations/{module}/`.