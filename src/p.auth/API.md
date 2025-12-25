# Auth Module - API Reference

## Base URL & Authentication
- **Base URL**: `http://localhost:3000/api/auth`
- **Public Endpoints**: No authentication required
- **Protected Endpoints**: JWT token in `Authorization: Bearer {token}` header
- **Content-Type**: `application/json`

---

## Standard Response Format

### Success Response (200)
```json
{
  "status": "success",
  "message": "Operation successful",
  "data": {}
}
```

### Error Response (400/401/429/500)
```json
{
  "status": "error",
  "message": "Error description",
  "code": 400
}
```

---

## Public Authentication Endpoints

### POST /register
Register new user account.

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "contact": "60123456789",
  "userType": 1
}
```

**Validation Rules**:
- Name: Required, letters/spaces/hyphens only, 2-100 chars
- Email: Required, valid format, company domain check (if configured)
- Contact: Required, 8-12 digits
- User Type: Required (1=Employee, 2=Customer, 3=Vendor)

**Response (200)**:
```json
{
  "status": "success",
  "message": "Registration successful. Check email for activation.",
  "data": {
    "id": 101,
    "email": "john@company.com",
    "message": "A verification email has been sent to your email address"
  }
}
```

**Error Responses**:
- `400` - Validation failed (invalid format, duplicate email/contact)
- `400` - Company email required for employees

---

### POST /activate
Activate user account with email verification code.

**Request Body**:
```json
{
  "email": "john@company.com",
  "contact": "60123456789",
  "activationCode": "ABC123DEF456",
  "password": "SecurePassword123"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Account activated successfully",
  "data": {
    "id": 101,
    "email": "john@company.com",
    "activated_at": "2024-12-25T10:30:00Z"
  }
}
```

**Error Responses**:
- `400` - Invalid activation code
- `400` - Code expired
- `400` - Account already activated

---

### POST /login
Authenticate user and get session token.

**Request Body**:
```json
{
  "email": "john@company.com",
  "password": "SecurePassword123"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 101,
      "email": "john@company.com",
      "fname": "John Doe",
      "role": 1,
      "usergroups": "1,2,3",
      "avatar": "/uploads/avatars/user_101.jpg"
    },
    "navigation": [
      { "label": "Dashboard", "href": "/dashboard", "icon": "home" },
      { "label": "Assets", "href": "/assets", "icon": "package" }
    ]
  }
}
```

**Error Responses**:
- `401` - Invalid email or password
- `401` - Account not activated
- `401` - Account deactivated
- `429` - Too many failed attempts (rate limited)

---

### POST /forgot-password
Request password reset token.

**Request Body**:
```json
{
  "email": "john@company.com"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Password reset link sent to your email"
}
```

---

### POST /reset-password
Reset password with token from email.

**Request Body**:
```json
{
  "resetToken": "token_from_email",
  "newPassword": "NewSecurePassword123"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Password reset successfully"
}
```

**Error Responses**:
- `400` - Invalid or expired reset token
- `400` - Password requirements not met

---

### GET /verify-email/:email
Check if email is available for registration.

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "email": "john@company.com",
    "available": true
  }
}
```

---

## Protected Endpoints (JWT Required)

### POST /logout
Logout user and clear session.

**Response (200)**:
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

### POST /change-password
Change password for authenticated user.

**Request Body**:
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Password changed successfully"
}
```

---

### GET /me
Get current authenticated user info.

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "id": 101,
    "email": "john@company.com",
    "fname": "John Doe",
    "role": 1,
    "status": 1,
    "last_login": "2024-12-25T14:30:00Z"
  }
}
```

---

### POST /refresh
Refresh JWT session token.

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

---

## Error Codes Reference

| Code | Message | Solution |
|------|---------|----------|
| 400 | Validation failed | Check field requirements |
| 401 | Credentials invalid | Check password |
| 429 | Too many attempts | Wait 15 minutes |
| 500 | Internal server error | Contact support |

---

## See Also
- [README.md](README.md) - Module overview and workflows
- [SCHEMA.md](SCHEMA.md) - Database schema and table definitions
- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Features and implementation details
