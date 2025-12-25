# Authentication Module (p.auth)

## Overview
The Authentication module provides comprehensive user registration, login, password management, and authentication workflow. It handles session management, JWT token generation, activation codes, and audit logging for all authentication activities.

## Key Features
- User registration with validation (email, contact, company domain check)
- Email verification and activation flow
- Secure password management (bcrypt hashing)
- JWT-based session token management
- Password reset with time-limited tokens
- Rate limiting on failed login attempts
- Comprehensive authentication audit logging
- Role-based access control
- Admin approval workflow for user activation
- Group and module membership assignment
- Notification system for account events

## Module Structure

### Core Files
- `adms/authController.ts` - HTTP request handlers for auth operations
- `adms/authRoutes.ts` - API route definitions for authentication endpoints

### Integration Points
- Uses `p.user/userModel.ts` for user data operations
- Uses `p.user/pendingUserModel.ts` for pending user management
- Integrates with `p.admin/logModel.ts` for audit logging
- Integrates with notification system for email alerts
- Uses JWT for session token management

## Architecture Overview

```
Registration Flow
  ├─ Register (pending_users table)
  ├─ Email Verification (activation code sent)
  ├─ Admin Approval (optional)
  └─ Activate Account (moved to users table)

Authentication Flow
  ├─ Login with email/contact + password
  ├─ Validate credentials
  ├─ Generate JWT session token
  ├─ Log authentication activity
  └─ Return token + user data

Password Management
  ├─ Change Password (authenticated user)
  ├─ Forgot Password (send reset link)
  └─ Reset Password (verify token, update password)
```

## Main Workflows

### 1. User Registration
- User submits registration form (name, email, contact, user type)
- Server validates all fields (email format, contact digits, company domain)
- Check for duplicate email/contact
- Generate activation code
- Create record in pending_users table
- Send activation email
- Return success/error response

### 2. Account Activation
- User clicks activation link or enters code
- Verify activation code in pending_users
- Move user to active users table
- Hash password
- Assign default role and groups
- Log activation event
- Send account activated email
- Delete from pending_users

### 3. User Login
- User submits email/contact + password
- Query users table
- Compare password hash with bcrypt
- Check user status (active)
- Generate JWT session token (valid for token_exp time)
- Update last_login, last_ip, last_os, last_host
- Log successful login
- Return token + user navigation tree + profile data

### 4. Password Reset
- User requests password reset
- Verify email exists
- Generate reset token (time-limited)
- Send reset link to email
- User clicks link and enters new password
- Verify reset token validity
- Hash new password
- Update password
- Clear reset token
- Log password reset
- Send password changed email

## Quick Start Examples

### Register New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@company.com",
    "contact": "60123456789",
    "userType": 1
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@company.com",
    "password": "securePassword123"
  }'
```

### Request Password Reset
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "john@company.com"}'
```

### Reset Password with Token
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "resetToken": "token_from_email",
    "newPassword": "newSecurePassword123"
  }'
```

## Module Dependencies

| Module | Dependency | Purpose |
|--------|-----------|---------|
| p.user | Bidirectional | Shared user data, profiles, groups |
| p.admin | Logging | Authentication audit trail |
| p.notification | Events | Email notifications for auth events |
| p.nav | Navigation | Build navigation tree for authenticated users |
| p.group | Groups | User group assignment |
| p.role | Roles | Role-based access control |

## Technologies Used
- **Node.js** - Server runtime
- **Express.js** - HTTP framework
- **MySQL2** - Database connection
- **JWT** - Session token management
- **bcrypt** - Password hashing
- **Nodemailer** - Email sending
- **Rate Limiter** - Failed attempt blocking

## Access Control

### Public Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/activate` - Account activation
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/verify-email/:email` - Check email availability

### Protected Endpoints (JWT Required)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh JWT token

### Admin Endpoints
- `POST /api/auth/admin/approve-pending/:id` - Approve pending user
- `POST /api/auth/admin/bulk-invite` - Send bulk invitations
- `GET /api/auth/admin/pending-users` - List pending users

## Key Metrics

| Metric | Value |
|--------|-------|
| Database Tables | 12+ tables |
| API Endpoints | 20+ endpoints |
| User Types Supported | Employee (1), Customer (2), Vendor (3), etc. |
| Password Hash Algorithm | bcrypt with salt rounds: 10 |
| Session Token Expiry | Configurable (default: 24 hours) |
| Password Reset Token Valid | 1 hour |
| Max Failed Login Attempts | 5 (configurable) |
| Rate Limit Lockout Period | 15 minutes |

## Common Error Scenarios

| Scenario | Response | Solution |
|----------|----------|----------|
| Invalid email format | 400 Validation failed | Use valid email format |
| Duplicate email | 400 Email already registered | Use different email |
| Account not activated | 401 Account not active | Complete activation |
| Invalid password | 401 Credentials invalid | Check password |
| Expired reset token | 400 Reset token expired | Request new password reset |
| JWT token expired | 401 Unauthorized | Refresh or re-login |
| Rate limit exceeded | 429 Too many attempts | Wait 15 minutes |

## Related Documentation
- **SCHEMA.md** - Database schema and relationships
- **API.md** - Complete endpoint reference and examples
- **ENHANCEMENTS.md** - Features, workflows, and future improvements

---

**Note**: Auth and User modules are interdependent and planned for future merger. Both are documented separately for clarity during transition.
