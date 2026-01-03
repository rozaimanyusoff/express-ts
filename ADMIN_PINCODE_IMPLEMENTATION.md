# Admin Pincode Authentication - Implementation Summary

## Overview
Implemented `/api/auth/admin/pincode` endpoint for special admin access during maintenance mode. This feature allows admins to request a 6-digit pincode via email for verification.

## Endpoint Details

### **POST** `/api/auth/admin/pincode`
- **Purpose**: Send a 6-digit pincode to admin email for special maintenance access
- **Rate Limited**: Yes (standard auth rate limiters applied)
- **Authentication**: Not required (used during maintenance/access issues)

### Request Payload
```json
{
  "emailOrUsername": "000277"
}
```

**Validation**:
- `emailOrUsername` is required (string)
- User must exist in database
- User must have `role: 1` (admin role) ⭐

### Success Response (200)
```json
{
  "status": "success",
  "message": "Pincode has been sent to your email",
  "data": {
    "email": "admin@company.com",
    "expiresIn": "15 minutes"
  }
}
```

### Error Responses

**400** - Missing/invalid input:
```json
{
  "status": "error",
  "message": "emailOrUsername is required",
  "data": null
}
```

**404** - User not found:
```json
{
  "status": "error",
  "message": "User not found",
  "data": null
}
```

**403** - User does not have admin role:
```json
{
  "status": "error",
  "message": "You do not have admin access",
  "data": null
}
```

**500** - Server error:
```json
{
  "status": "error",
  "message": "Failed to send pincode",
  "data": null
}
```

## Implementation Details

### Files Modified

#### 1. **[src/p.auth/adms/authRoutes.ts](src/p.auth/adms/authRoutes.ts)**
- Added route: `router.post('/admin/pincode', rateLimiter[0], rateLimiter[1], asyncHandler(sendAdminPincode));`
- Applied rate limiting to prevent brute force
- Imported `sendAdminPincode` controller function

#### 2. **[src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts)**
- Added import: `import { adminPincodeTemplate } from '../../utils/emailTemplates/adminPincode';`
- Implemented `sendAdminPincode()` controller function with:
  - Input validation
  - User lookup by username or email
  - Admin role (role: 1) verification
  - 6-digit pincode generation
  - Pincode storage with 15-minute expiry
  - Email delivery with security template
  - Activity logging for auditing

#### 3. **[src/p.user/userModel.ts](src/p.user/userModel.ts)**
- Added `getUserByUsernameOrEmail()` - Find user by username or email
- Added `storeAdminPincode()` - Store hashed pincode with expiry
- Added `verifyAdminPincode()` - Verify pincode against stored hash
- Added `clearAdminPincode()` - Clear pincode after verification

#### 4. **[src/utils/emailTemplates/adminPincode.ts](src/utils/emailTemplates/adminPincode.ts)** (New)
- Professional HTML email template
- Displays 6-digit pincode prominently
- Includes security warnings
- Shows 15-minute expiration notice
- Mobile-responsive design

## Security Features

✅ **Role-Based Access**: Only users with `role: 1` can request pincodes  
✅ **Rate Limiting**: Standard auth rate limiters prevent brute force  
✅ **Hashed Storage**: Pincodes stored with bcrypt hashing (not plaintext)  
✅ **Time-Limited**: Pincodes expire after 15 minutes  
✅ **Audit Logging**: All requests logged to `logModel` for security auditing  
✅ **Email-Based**: Pincode sent only to registered email, not displayed in response  
✅ **Clear Separation**: Uses `reset_token` field temporarily for pincode storage  

## Frontend Integration

### Usage Flow
```javascript
// Step 1: Request pincode (from maintenance login screen)
const response = await fetch('/api/auth/admin/pincode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailOrUsername: '000277' })
});

const data = await response.json();
if (data.status === 'success') {
  showMessage(`Pincode sent to ${data.data.email}`);
  // Show pincode verification form
} else {
  showError(data.message);
}

// Step 2: Frontend sends verification code to separate endpoint
// (If you need a verification endpoint, we can add /api/auth/admin/verify-pincode)
```

### Display Suggestions
- Show on maintenance login page before main login form
- Allow admin to enter username/email
- Show success message with expiry time
- Provide field for pincode entry
- Optional: Show countdown timer (15 minutes)

## Testing

### Test Case 1: Valid Admin User
```bash
curl -X POST http://localhost:5000/api/auth/admin/pincode \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername": "000277"}'
# Expected: 200 with pincode sent to email
```

### Test Case 2: Non-Admin User (role ≠ 1)
```bash
curl -X POST http://localhost:5000/api/auth/admin/pincode \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername": "regular_user"}'
# Expected: 403 - "You do not have admin access"
```

### Test Case 3: Non-Existent User
```bash
curl -X POST http://localhost:5000/api/auth/admin/pincode \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername": "nonexistent@example.com"}'
# Expected: 404 - "User not found"
```

## Configuration

**Pincode Expiry**: 15 minutes (configurable in [src/p.user/userModel.ts#storeAdminPincode](src/p.user/userModel.ts) line ~968)
```typescript
await userModel.storeAdminPincode(user.id, pincode, 15); // Change 15 to different minutes
```

**Pincode Digits**: 6 digits (configurable in [src/p.auth/adms/authController.ts#sendAdminPincode](src/p.auth/adms/authController.ts))
```typescript
const pincode = String(Math.floor(100000 + Math.random() * 900000)); // For 6 digits
```

## Future Enhancements

1. **Add `/api/auth/admin/verify-pincode`** endpoint to verify the pincode and return temporary access token
2. **Add pincode attempt tracking** to prevent guessing
3. **Add SMS fallback** in addition to email
4. **Add pincode resend** functionality with cooldown
5. **Add audit dashboard** to view all admin pincode requests
6. **Add IP/geolocation logging** for security alerts

## Database

No new tables required - uses existing `users.reset_token` field temporarily to store hashed pincode.

## Logging & Auditing

All requests are logged to `auth_logs` via `logModel.logAuthActivity()`:
- Success: `action: 'send_admin_pincode'`, `status: 'success'`
- Failures: Includes reason (insufficient_role, user_not_found, etc.)
- Can be viewed at `/api/admin/logs` (if admin logs endpoint exists)
