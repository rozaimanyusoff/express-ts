# Admin Pincode - Quick Reference

## Endpoint
```
POST /api/auth/admin/pincode
```

## Request
```json
{
  "emailOrUsername": "000277"
}
```

## Requirements
- ✅ User must exist (by username or email)
- ✅ User must have `role: 1` (admin)

## Response on Success (200)
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

## Response on Error
- **400**: Invalid/missing emailOrUsername
- **404**: User not found
- **403**: User doesn't have admin role (role ≠ 1)
- **500**: Email sending failed

## What Happens When Called

1. ✉️ **6-digit pincode generated** (e.g., 847291)
2. 📧 **Email sent** with secure template showing pincode
3. 💾 **Pincode stored hashed** in database with 15-min expiry
4. 📝 **Activity logged** for audit trail

## Database Impact

- Uses existing `reset_token` field to store hashed pincode
- No schema changes needed
- Pincode expires automatically after 15 minutes

## Security

- 🔒 Pincodes hashed with bcrypt
- 🚫 Rate limited (prevents brute force)
- 📋 Audit logged (track all requests)
- 👮 Role-based access control (admin only)

## Frontend Integration

**Show this on maintenance login screen:**
1. Username/Email input field
2. "Send Admin Access Code" button
3. On success: "Code sent! Check your email"
4. Pincode verification form (input field for 6 digits)

## Next Step (Optional)

Create `/api/auth/admin/verify-pincode` endpoint to:
- Accept pincode from user
- Verify it's correct
- Return temporary access token/session
- Clear the pincode from database

Contact backend team to implement verification endpoint if needed.
