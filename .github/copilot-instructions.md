# GitHub Copilot Instructions

This is a comprehensive Express TypeScript backend API for enterprise management systems including maintenance, billing, assets, and user management.

## Architecture Overview

### Module Structure (`p.*` Pattern)
- Each business domain is organized as `p.{domain}/` (e.g., `p.maintenance/`, `p.asset/`, `p.billing/`)
- Every module follows MVC pattern: `{domain}Controller.ts`, `{domain}Model.ts`, `{domain}Routes.ts`
- Services use `s.{domain}/` prefix (e.g., `s.webstock/`)

### Database Architecture
- Dual database setup: `pool` (main) and `pool2` (secondary) from `src/utils/db.ts`
- Models use database-scoped table declarations: `const dbMaintenance = 'applications'`
- Connection pooling via `mysql2/promise` with environment-driven configuration

### Key Patterns
- **Error Handling**: All route handlers wrapped with `asyncHandler` utility
- **Authentication**: JWT-based with `tokenValidator` middleware, user context in `req.user`
- **File Uploads**: Static files served from `/mnt/winshare` mounted at `/uploads`
- **WebSocket**: Socket.IO integration with CORS configured for real-time features

## Development Workflows

### Running the Application
```bash
npm run dev          # Development with tsx --watch
npm run build        # TypeScript compilation
npm start           # Production server
```

### Database Management
- SQL schema files in `src/db/` (tables defined as `.sql`)
- Migration scripts in `db/migrations/`
- Initialization script: `scripts/init-db.sh`

## Critical Conventions

### Route Protection
```typescript
// Default pattern: protect all /api routes except auth
app.use('/api/auth', authRoutes);
app.use('/api/users', tokenValidator, userRoutes);  // Protected
```

### Model Data Access
```typescript
// Standard pattern across all models
import { pool, pool2 } from '../utils/db';
const table = `${database}.table_name`;

export const getItems = async (filters?: any) => {
  const [rows] = await pool.query(`SELECT * FROM ${table}`);
  return rows;
};
```

### Controller Response Format
```typescript
// Standardized API response structure
res.json({
  status: 'success',
  message: 'Operation completed',
  data: result
});
```

### Error Handling Pattern
```typescript
// Always use asyncHandler for async route handlers
router.get('/endpoint', asyncHandler(controller.method));

// Controller error responses
return res.status(400).json({ 
  status: 'error', 
  message: 'Validation failed', 
  data: null 
});
```

## Integration Points

### Email System
- SMTP configuration via environment variables
- Email templates in `src/utils/emailTemplates/`
- Mailer utility: `src/utils/mailer.ts`

### File Management
- Upload utilities in `src/utils/` (`fileUploader.ts`, `uploadUtil.ts`)
- Static file serving with CORS headers for cross-origin access
- Base upload path configurable via `UPLOAD_BASE_PATH`

### Cross-Module Dependencies
- Asset management (`p.asset/`) used across maintenance, billing modules
- User management (`p.user/`) provides authentication context
- Navigation system (`p.nav/`) for menu structure and permissions

## Security Considerations

### JWT Implementation
- Token validation in `src/middlewares/tokenValidator.ts`
- User context extraction with fallback ID mapping
- Session management through JWT payload

### CORS Configuration
- Dual CORS setup: API endpoints and static file serving
- WebSocket CORS aligned with API configuration
- Environment-driven origin configuration recommended

### Rate Limiting & Security Headers
- Rate limiter middleware available but commented out in `app.ts`
- Security headers via Helmet middleware
- RSA decryption middleware for sensitive data

## Module Development Guidelines

When creating new modules:
1. Follow `p.{domain}/` naming convention
2. Implement standard MVC triad: Controller, Model, Routes
3. Add module routes to `src/app.ts` with appropriate middleware
4. Use `asyncHandler` for all async route handlers
5. Follow standardized response format for consistency
6. Import shared utilities from `src/utils/`
7. Implement proper error handling and validation

Example new module structure:
```
src/p.newmodule/
├── newmoduleController.ts  # Business logic
├── newmoduleModel.ts      # Database operations  
└── newmoduleRoutes.ts     # Route definitions
```