# Auth Module - Features & Enhancements

## Authentication Workflow

### User Registration Flow
```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ POST /register (email, password, name)
       ▼
┌──────────────────────┐
│  Validate Input      │
│  - Email format      │
│  - Company domain    │
│  - Duplicate check   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Create Pending User  │
│ - Hash password      │
│ - Generate code      │
│ - Status: pending    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Send Email          │
│  - Activation code   │
│  - Activation link   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  User Activates      │
│  POST /activate      │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Create Active User  │
│  - Move to users tbl │
│  - Delete pending    │
│  - Create profile    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Ready to Login      │
└──────────────────────┘
```

### Login & Session Workflow
```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ POST /login (email, password)
       ▼
┌──────────────────────┐
│  Validate Email      │
│  - User exists       │
│  - Account active    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Verify Password      │
│ - bcrypt compare     │
│ - Increment attempts │
│   if failed          │
└────────┬─────────────┘
         │ Success
         ▼
┌──────────────────────┐
│  Issue JWT Token     │
│  - Payload: user ID, │
│    email, role       │
│  - Expiry: 24 hours  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Log Auth Event      │
│  - logs_auth table   │
│  - Action: login     │
│  - IP, User agent    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Return Token &       │
│ User Navigation      │
└──────────────────────┘
```

---

## Security Features

### Password Security
**Implementation**: bcrypt hashing with 10 salt rounds
```typescript
// Password hashing on registration/reset
const hashedPassword = await bcrypt.hash(password, 10);

// Verification on login
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

**Requirements**:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character (@#$%^&*)

**Protections**:
- Never store plain passwords
- Never return password in responses
- Hash takes ~100ms (computational cost prevents brute force)

---

### Session Token Management
**JWT Implementation**:
- Token format: Header.Payload.Signature
- Signing algorithm: HS256 (HMAC SHA-256)
- Secret key: Environment variable (ADMIN_KEY)

**JWT Payload Structure**:
```json
{
  "id": 101,
  "email": "john@company.com",
  "role": 1,
  "iat": 1703502600,
  "exp": 1703589000
}
```

**Token Expiration**:
- Default: 24 hours
- Refresh endpoint extends by 24 hours
- Expired tokens cause 401 responses
- Frontend must re-authenticate

**Token Validation**:
```typescript
// Middleware checks token validity
const decoded = jwt.verify(token, process.env.ADMIN_KEY);
// Sets req.user with decoded payload
```

---

### Email Verification System
**Activation Code Generation**:
- 12-character alphanumeric code (A-Z, 0-9)
- Stored hashed in pending_users table
- Single-use and time-limited

**Verification Flow**:
1. User registers → Code generated
2. Email sent with code and link
3. User clicks link or enters code manually
4. POST /activate validates and moves to active users
5. Code deleted from pending_users

**Email Template**:
```
Subject: Activate Your Account

Dear John Doe,

Welcome to our system! Click the link below to activate your account:

http://frontend.com/activate?code=ABC123DEF456&email=john@company.com

Or enter this activation code: ABC123DEF456

This link expires in 24 hours.

Best regards,
Admin Team
```

---

### Password Reset System
**Token Generation**:
- Time-limited reset token (1 hour expiration)
- Stored in reset_tokens table with user_id
- Single-use: deleted after successful reset

**Reset Flow**:
1. User requests reset: POST /forgot-password
2. System generates reset token
3. Email sent with reset link
4. User clicks link and enters new password
5. POST /reset-password validates token
6. Password updated and token deleted

**Email Template**:
```
Subject: Password Reset Request

Click the link below to reset your password:
http://frontend.com/reset?token=xyz789...

This link expires in 1 hour.

If you didn't request this, ignore this email.
```

---

### Rate Limiting
**Failed Login Attempts**:
- Tracks failed attempts per email
- Increments on wrong password
- Resets on successful login

**Rate Limit Rules**:
- After 5 failed attempts: Account locked for 15 minutes
- Error message: "Too many failed attempts. Try again in 15 minutes."
- Uses `failed_attempts` field in users table
- Uses `last_attempt_at` timestamp for unlock

**Implementation**:
```typescript
// Check attempts before password verification
if (user.failed_attempts >= 5) {
  const lockTime = 15 * 60 * 1000; // 15 minutes
  if (Date.now() - user.last_attempt_at < lockTime) {
    return res.status(429).json({ 
      status: 'error',
      message: 'Account locked. Try again later.'
    });
  }
  // Reset attempts if lockout expired
  user.failed_attempts = 0;
}
```

---

### Audit Logging
**logs_auth Table**:
- Records all authentication events
- Tracks security incidents
- Enables admin monitoring

**Logged Events**:
```
registration    - User registered
activation      - Account activated
login           - Successful login
login_failed    - Failed login attempt
logout          - User logged out
password_change - Password changed
password_reset  - Password reset
password_reset_request - Reset requested
token_refresh   - Token refreshed
account_lock    - Account locked due to failed attempts
```

**Log Entry Structure**:
```json
{
  "id": 1,
  "user_id": 101,
  "action": "login",
  "status": "success",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "details": {"login_method": "email_password"},
  "created_at": "2024-12-25T10:30:00Z"
}
```

---

## Integration Points

### With User Module (p.user)
```typescript
// Auth module imports from user
import { getUserById, getUserByEmail } from '../p.user/userModel';
import { createUserProfile } from '../p.user/userModel';

// Flow:
// 1. Auth handles registration/login
// 2. User module creates/updates profile
// 3. Shared users table between modules
```

**Shared Responsibilities**:
- Auth: Registration, activation, login, password management
- User: Profile creation, group assignment, task management
- Both: Access to users table for user operations

---

### With Admin Module (p.admin)
```typescript
// Auth logs events for admin monitoring
import { logAuthEvent } from '../p.admin/logModel';

// Usage
await logAuthEvent({
  user_id: user.id,
  action: 'login',
  status: 'success',
  ip_address: req.ip,
  user_agent: req.get('user-agent')
});
```

---

### With Notification Module (p.notification)
```typescript
// Auth triggers emails through notification system
import { sendEmail } from '../p.notification/mailer';

// Send activation email
await sendEmail({
  to: user.email,
  template: 'activation',
  data: { name: user.fname, code: activationCode }
});
```

---

### With Navigation Module (p.nav)
```typescript
// Auth returns user navigation tree on login
import { getNavigationByRole } from '../p.nav/navModel';

// Login response includes navigation
const navigation = await getNavigationByRole(user.role);
response.data.navigation = navigation;
```

---

## Company Domain Validation

**Purpose**: Restrict employee registration to company email addresses

**Configuration**:
```
Environment Variable: COMPANY_DOMAIN
Example: company.com

If set: Employee (userType=1) must use @company.com email
If not set: Any email accepted
```

**Implementation**:
```typescript
const email = 'john@company.com';
const domain = email.split('@')[1];

if (userType === 1 && domain !== process.env.COMPANY_DOMAIN) {
  return res.status(400).json({
    status: 'error',
    message: `Employee accounts require ${process.env.COMPANY_DOMAIN} email address`
  });
}
```

---

## Validation Rules

### Email Validation
- Valid format (RFC 5322 simplified)
- Must contain @
- Domain must be valid
- Case-insensitive comparison
- Duplicates rejected

### Password Validation
- Minimum 8 characters
- At least 1 uppercase (A-Z)
- At least 1 lowercase (a-z)
- At least 1 number (0-9)
- At least 1 special (@#$%^&*)

### Name Validation
- 2-100 characters
- Letters, spaces, hyphens only
- No special characters

### Contact Validation
- 8-12 digits
- Numeric only
- No spaces or hyphens

---

## Error Handling

### Registration Errors
```typescript
// Validation errors
if (!email || !password || !name) {
  return res.status(400).json({
    status: 'error',
    message: 'Missing required fields'
  });
}

// Email already exists
const existing = await getUserByEmail(email);
if (existing) {
  return res.status(400).json({
    status: 'error',
    message: 'Email already registered'
  });
}

// Company domain check
if (userType === 1 && !email.endsWith('@company.com')) {
  return res.status(400).json({
    status: 'error',
    message: 'Employee accounts require company email'
  });
}
```

### Authentication Errors
```typescript
// Invalid credentials
if (!user || !await bcrypt.compare(password, user.password)) {
  await logAuthEvent({...}, 'login_failed');
  return res.status(401).json({
    status: 'error',
    message: 'Invalid email or password'
  });
}

// Account not activated
if (user.status === 0) {
  return res.status(401).json({
    status: 'error',
    message: 'Account not activated. Check your email.'
  });
}

// Rate limited
if (user.failed_attempts >= 5) {
  return res.status(429).json({
    status: 'error',
    message: 'Too many failed attempts. Try again in 15 minutes.'
  });
}
```

---

## Future Enhancements

### Short-term (Planned)
1. **Merge with User Module**: Consolidate into single p.auth-user module
2. **Two-Factor Authentication**: SMS or TOTP-based 2FA
3. **OAuth2 Integration**: Google, Microsoft login options
4. **Session Management**: Track active sessions per user
5. **Logout All Devices**: Invalidate all tokens for user

### Medium-term (Roadmap)
1. **SAML Integration**: Enterprise SSO support
2. **Biometric Login**: Fingerprint/Face ID support
3. **Passwordless Authentication**: Email magic links
4. **Security Keys**: FIDO2/WebAuthn support
5. **Advanced Rate Limiting**: Exponential backoff

### Long-term (Future)
1. **Risk-based Authentication**: Adaptive security based on behavior
2. **Zero Trust Architecture**: Continuous verification
3. **Blockchain Integration**: Decentralized identity
4. **AI Anomaly Detection**: Detect unusual login patterns

---

## Module Merger Plan (p.auth + p.user → p.auth-user)

**Current State**:
- Two separate modules with shared database
- Auth: Registration, login, password management
- User: Profile, groups, tasks, permissions

**Merger Benefits**:
- Single responsibility (user identity)
- Unified API surface
- Shared database operations
- Simplified error handling
- Single documentation source

**Proposed Structure**:
```
src/p.auth-user/
├── authController.ts (registration, login, password)
├── userController.ts (profile, groups, tasks)
├── userModel.ts (all user operations)
├── authRoutes.ts (auth endpoints)
├── userRoutes.ts (user endpoints)
├── README.md (combined documentation)
├── SCHEMA.md (all tables)
├── API.md (all endpoints)
└── ENHANCEMENTS.md (features)
```

**Migration Path**:
1. Document both modules separately (current phase)
2. Create unified API documentation
3. Merge code into single module structure
4. Update all import paths across application
5. Run comprehensive tests
6. Update dependent modules

---

## Testing Checklist

- [ ] Register with valid company email
- [ ] Register with invalid email format
- [ ] Register with duplicate email
- [ ] Activate account with valid code
- [ ] Activate with expired code (>24hrs)
- [ ] Login with correct password
- [ ] Login with wrong password (×5, check rate limit)
- [ ] Login with unactivated account
- [ ] Logout and verify token invalidation
- [ ] Change password (authenticated)
- [ ] Verify old password doesn't work
- [ ] Request password reset
- [ ] Reset with valid token
- [ ] Reset with expired/invalid token
- [ ] Refresh token extends session
- [ ] Verify JWT payload contains correct data
- [ ] Check audit logs recorded properly
- [ ] Test company domain validation
- [ ] Verify email templates have correct links
- [ ] Check rate limiting resets on successful login

---

## See Also
- [README.md](README.md) - Module overview and workflows
- [SCHEMA.md](SCHEMA.md) - Database schema and table definitions
- [API.md](API.md) - Complete API reference
