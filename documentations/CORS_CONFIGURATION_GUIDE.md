# CORS Configuration Guide

**Last Updated**: February 4, 2026  
**Status**: ✅ CONFIGURED  
**Related Issue**: Failure Point #14 - CORS Hardcoded Origins

## Overview

CORS (Cross-Origin Resource Sharing) origins are now **fully configurable via environment variables** instead of being hardcoded in the source code. This allows different deployment environments (dev, staging, production) to have different CORS policies without code changes.

## Environment Variable Setup

### Define CORS Origins in `.env`

Add the following line to your `.env` file:

```bash
# CORS_ALLOWED_ORIGINS - Comma-separated list of allowed origins
# Format: origin1,origin2,origin3
# Example for development:
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080

# Example for production:
# CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

## Environment-Specific Examples

### Development (.env.development)
```bash
NODE_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080
```

### Staging (.env.staging)
```bash
NODE_ENV=staging
CORS_ALLOWED_ORIGINS=https://staging-app.example.com,https://staging-admin.example.com
```

### Production (.env.production)
```bash
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com,https://api.example.com
```

## Special Cases

### Mobile Apps (No Origin Header)
Mobile apps typically don't send an `Origin` header. The configuration automatically allows requests without an origin:

```typescript
// Requests with no origin are allowed (mobile apps, server-to-server)
if (!origin) {
  callback(null, true);
  return;
}
```

### Development Mode Defaults
If `NODE_ENV=development` and `CORS_ALLOWED_ORIGINS` is not set, these defaults are used:
- `http://localhost:5173`
- `http://localhost:3000`
- `http://localhost:8080`

### Production Mode Without Config
If `NODE_ENV=production` and `CORS_ALLOWED_ORIGINS` is not set:
- ⚠️ **No origins are allowed** (most restrictive)
- Warning is logged to console
- You **must** explicitly set `CORS_ALLOWED_ORIGINS`

## Real-World Configuration Examples

### Ranhill Technologies Setup (Example)
```bash
# Production
CORS_ALLOWED_ORIGINS=https://adms4.ranhilltechnologies.com.my,https://serv.ranhilltechnologies.com.my,https://aqs.ranhilltechnologies.com.my

# Development (internal network)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://192.168.1.100:3000
```

### Multiple Subdomains
```bash
# Allow all requests from a domain and its subdomains
# (Note: CORS does NOT support wildcard origins with credentials=true)
CORS_ALLOWED_ORIGINS=https://app.example.com,https://api.example.com,https://admin.example.com,https://reports.example.com
```

## Implementation Details

### Source File
- **File**: [src/middlewares/cors.ts](src/middlewares/cors.ts)
- **Function**: `getallowedOrigins()` - Parses and validates origins from ENV

### Key Features
1. ✅ Comma-separated list parsing
2. ✅ Automatic whitespace trimming
3. ✅ Environment-aware defaults
4. ✅ Console warnings for misconfiguration
5. ✅ Mobile app support (no-origin requests)
6. ✅ Secure production defaults

## Testing CORS Configuration

### Test a Specific Origin
```bash
curl -X OPTIONS http://localhost:3030/api/users \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### Check Allowed Origins
Look for these headers in the response:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Test Blocked Origin
```bash
curl -X OPTIONS http://localhost:3030/api/users \
  -H "Origin: http://malicious.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Expected response: **403 Forbidden** or **CORS error**

## Security Best Practices

### ✅ DO:
- Use HTTPS URLs in production (e.g., `https://app.example.com`)
- Keep the origin list minimal - only include necessary origins
- Use different `.env` files for each environment
- Review and update origins when adding new frontends
- Keep test/internal origins out of production

### ❌ DON'T:
- Use wildcards like `http://*` or `*` (except when credentials=false)
- Include `localhost` or `127.0.0.1` in production
- Share the same `.env` file across environments
- Leave hardcoded test origins in production
- Use IP addresses instead of domain names (when possible)

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' Header"

**Problem**: Request is blocked by CORS policy

**Solution**: 
1. Check that the origin is in `CORS_ALLOWED_ORIGINS`
2. Ensure no typos in the origin URL (e.g., `http://` vs `https://`)
3. Check that port is correct if using non-standard ports
4. Verify `.env` file is loaded correctly

### Warning: "No CORS_ALLOWED_ORIGINS Configured"

**Problem**: You're in production mode but didn't set the ENV variable

**Solution**:
```bash
# Add to your .env file:
CORS_ALLOWED_ORIGINS=https://your-app.example.com
```

### CORS Works in Development but Not Production

**Problem**: Different `.env` files or NODE_ENV is set incorrectly

**Solution**:
1. Verify `NODE_ENV=production` in your production `.env`
2. Ensure `CORS_ALLOWED_ORIGINS` is set for production
3. Use HTTPS URLs in production
4. Check server logs for CORS warnings

## Related Configuration

### WebSocket CORS (Socket.IO)
The Socket.IO CORS is configured separately in [src/server.ts](src/server.ts):

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
  },
});
```

**Note**: Socket.IO CORS should match the HTTP CORS configuration for consistency.

## Migration from Hardcoded Origins

If you're migrating from the old hardcoded configuration:

**Old (Hardcoded in Code)**:
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://adms4.ranhilltechnologies.com.my',
  // ... more origins hardcoded
];
```

**New (Environment Variable)**:
```bash
# .env
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://adms4.ranhilltechnologies.com.my
```

### Migration Steps:
1. ✅ Update [src/middlewares/cors.ts](src/middlewares/cors.ts) (already done)
2. ✅ Add `CORS_ALLOWED_ORIGINS` to `.env`
3. ✅ Test with `curl` or Postman
4. ✅ Deploy to each environment with appropriate origins
5. ✅ Monitor logs for CORS-related issues

## Monitoring & Logging

When CORS denies a request, the server logs the rejected origin:

```
CORS Error: Origin 'http://malicious.example.com' not allowed by CORS
```

Check logs in:
- Development: Console output
- Production: Application logs/monitoring system

## References

- [MDN: CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Package](https://github.com/expressjs/cors)
- [Socket.IO CORS Configuration](https://socket.io/docs/v4/handling-cors/)

---

**Last Updated**: February 4, 2026  
**Status**: Ready for Production ✅
