# Failure Points Analysis: Core, Middleware & Authentication

**Date**: February 4, 2026  
**Scope**: Core application (`app.ts`, `server.ts`), Middleware layer, and Authentication module  
**Status**: Comprehensive vulnerability and failure point documentation

---

## 🔴 CRITICAL FAILURE POINTS

### 1. **Token Validation Missing JWT_SECRET Configuration** ✅ FIXED
**File**: [src/middlewares/tokenValidator.ts](src/middlewares/tokenValidator.ts#L23-L26)  
**Severity**: 🔴 CRITICAL  
**Issue**: JWT_SECRET is checked but missing error response may not be sent properly - NOW FIXED with proper logging

```typescript
if (!JWT_SECRET) {
  res.status(500).json({ message: 'Server configuration error: JWT secret not set' });
  return; // ❌ Promise return not awaited
}
```

**Failure Scenario**:
- If `JWT_SECRET` env var is missing, responds with 500 but execution continues
- Session validation may bypass if undefined secret causes exception

**Fix**: Add proper error handling and prevent next() execution
```typescript
if (!JWT_SECRET) {
  res.status(500).json({ message: 'Server configuration error: JWT secret not set' });
  return; // Already correct, but ensure next() is never called
}
```

---

### 2. **Session Validation Silently Fails on Error** ✅ FIXED
**File**: [src/middlewares/tokenValidator.ts](src/middlewares/tokenValidator.ts#L46-L54)  
**Severity**: 🔴 CRITICAL  
**Issue**: Catch-all error handler silently rejects with generic message - NOW FIXED with proper error logging

```typescript
try {
  const current = await userModel.getUserSessionToken(Number(uid));
  if (!current || current !== sess) {
    res.status(401).json({ message: 'Session expired or invalidated' });
    return;
  }
} catch (_) {  // ❌ Swallows all errors including DB connection failures
  res.status(401).json({ message: 'Session validation failed' });
  return;
}
```

**Failure Scenario**:
- Database query throws error → masked as session failure
- Real errors (DB down, connection timeout) not distinguished from auth failures
- No logging of actual error for debugging
- Cannot distinguish between real session expiration vs. infrastructure issues

**Impact**: Users cannot troubleshoot legitimate database/connection problems

---

### 3. **Unvalidated Frontend URL in Auth Controller** ✅ FIXED
**File**: [src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts#L30-L36)  
**Severity**: 🔴 CRITICAL  
**Issue**: URL validation happens but errors thrown at module load time - NOW FIXED with lazy initialization and fallback

```typescript
let sanitizedFrontendUrl;
try {
    sanitizedFrontendUrl = (process.env.FRONTEND_URL ?? '').replace(/([^:]\/\/)+/g, '$1');
    new URL(sanitizedFrontendUrl); // Validate the URL
} catch (error) {
    logger.error('Invalid FRONTEND_URL in environment variables:', error);
    throw new Error('Invalid FRONTEND_URL in environment variables');
}
```

**Failure Scenario**:
- Server crashes at startup if FRONTEND_URL is invalid
- No fallback mechanism
- Users cannot login/activate accounts without this env var
- Production deployment blocked if ENV is misconfigured

**Impact**: Complete application unavailability on startup

---

### 4. **RSA Decrypt Middleware Missing Error Logging Context**
**File**: [src/middlewares/rsaDecrypt.ts](src/middlewares/rsaDecrypt.ts#L22-L32)  
**Severity**: 🔴 CRITICAL  
**Issue**: Generic error response masks decryption failures, no audit trail

```typescript
try {
  const decrypted = crypto.privateDecrypt({...}, Buffer.from(encrypted, 'base64'));
  req.body.password = decrypted.toString('utf-8');
  next();
} catch (err: any) {
  console.error('[RSA Decryption Error]', err.message || err);
  res.status(400).json({ message: 'Invalid encrypted password' });
  // ❌ No logging to database, no IP tracking, no rate limit coordination
}
```

**Failure Scenario**:
- Base64 decode errors treated as RSA failures
- Private key missing/corrupted → generic error response
- No audit trail for decryption failures
- Cannot detect brute force attempts on encryption layer
- Security issue: attackers cannot be traced

**Fix**: Add proper error categorization and logging

---

### 5. **Async Handler Does Not Return Promise** ✅ FIXED
**File**: [src/utils/asyncHandler.ts](src/utils/asyncHandler.ts)  
**Severity**: 🟠 HIGH  
**Issue**: Missing return statement in async handler - NOW FIXED with proper return statement

```typescript
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next); // ❌ Missing return statement
  };
};
```

**Failure Scenario**:
- Error handling works but Promise is not awaited
- Unhandled promise rejections may not be caught in all scenarios
- Race conditions if response is sent before async operation completes

**Fix**: Add return statement
```typescript
return (req: Request, res: Response, next: NextFunction) => {
  return fn(req, res, next).catch(next);
};
```

---

### 6. **Login Password Verification Missing Activation Status Check** ✅ FIXED
**File**: [src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts#L510-L530)  
**Severity**: 🔴 CRITICAL  
**Issue**: User can login without proper activation validation sequence - NOW FIXED with validation and error handling

```typescript
export const login = async (req: Request, res: Response): Promise<Response> => {
    const { emailOrUsername, password } = req.body;
    try {
        const result: any = await userModel.verifyLoginCredentials(emailOrUsername, password);

        if (!result.success) {
            try { recordFailedAttempt(req); } catch {}
            return res.status(401).json({ code: 401, message: 'Invalid credential', status: 'error' });
        }

        if (result.user.status === 0) {
            return res.status(403).json({ code: 403, message: 'Account not activated...', status: 'error' });
        }
```

**Failure Scenario**:
- Status 0 (not activated) accounts can reach status check
- If activation check fails, user with valid credentials is logged out
- No re-entry prevention after partial login
- Single-session enforcement may fail to retrieve existing session (no error handling)

---

### 7. **Single-Session Enforcement Race Condition** ✅ FIXED
**File**: [src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts#L535-L545)  
**Severity**: 🟠 HIGH  
**Issue**: TOCTOU (Time-of-Check-Time-of-Use) vulnerability - NOW FIXED with atomic session setting

```typescript
const singleSessionEnforcement = process.env.SINGLE_SESSION_ENFORCEMENT === 'true';
if (singleSessionEnforcement) {
    const existingSession = await userModel.getUserSessionToken(result.user.id);
    if (existingSession) {
        await logModel.logAuthActivity(result.user.id, 'login', 'fail', { reason: 'already_logged_in' }, req);
        return res.status(403).json({ code: 403, message: 'This account is already logged in elsewhere...', status: 'error' });
    }
}

// ❌ Race condition: another request can login between check and setUserSessionToken
const sessionToken = uuidv4();
await userModel.setUserSessionToken(result.user.id, sessionToken);
```

**Failure Scenario**:
- Two simultaneous login attempts both pass existing session check
- Both get new tokens, violating single-session policy
- Database transaction isolation not guaranteed

---

### 8. **Frontend URL Sanitization Regex Vulnerability** ✅ FIXED
**File**: [src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts#L32)  
**Severity**: 🟠 HIGH  
**Issue**: Regex `/([^:]//)+/g` can fail with certain URL formats - NOW FIXED with URL constructor

```typescript
sanitizedFrontendUrl = (process.env.FRONTEND_URL ?? '').replace(/([^:]\/\/)+/g, '$1');
```

**Failure Scenario**:
- URL like `https://example.com///path` gets incorrectly sanitized
- Activation links use malformed URL
- User cannot activate account with formatted URL links
- Regex doesn't handle protocol://example.com:8080 (port numbers)

---

## 🟠 HIGH SEVERITY FAILURES

### 9. **Email Sending Failures Not Blocking Critical Operations** ✅ FIXED
**File**: [src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts#L366-L374)  
**Severity**: 🟠 HIGH  
**Issue**: Registration email sending failures are silently ignored - NOW FIXED with proper error responses

```typescript
try {
    await sendMail(normalizedEmail, 'Account Activation (Resent)', accountActivationTemplate(pending.fname || name, activationLink));
} catch (mailErr) {
    logger.error('Resend activation email error:', mailErr);
    // ❌ No notification to user that email failed
}
return res.status(200).json({ 
    message: 'Activation email resent. Please check your inbox.', 
    status: 'success' 
});
```

**Failure Scenario**:
- User believes email was sent but it wasn't
- User waits indefinitely for activation email
- No retry mechanism
- Multiple locations with same pattern (lines 370, 418, 456)

---

### 10. **Database Health Check No Timeout** ✅ FIXED
**File**: [src/utils/dbHealthCheck.ts](src/utils/dbHealthCheck.ts#L37-L42)  
**Severity**: 🟠 HIGH  
**Issue**: Query hangs indefinitely if database is unresponsive - NOW FIXED with 5-second timeout

```typescript
export const checkDatabaseHealth = async (): Promise<HealthCheckResult> => {
  const result: HealthCheckResult = {
    pool1: { connected: false },
    pool2: { connected: false }
  };

  // Check pool 1
  try {
    const start = Date.now();
    await pool.query('SELECT 1'); // ❌ No timeout set
    const latency = Date.now() - start;
```

**Failure Scenario**:
- Database connection hangs
- Health check endpoint blocks indefinitely
- No Retry-After header
- Server startup can hang (`testConnection()` in server.ts)

---

### 11. **Cache Middleware JSON Override Vulnerability** ✅ FIXED
**File**: [src/middlewares/cacheMiddleware.ts](src/middlewares/cacheMiddleware.ts#L31-L44)  
**Severity**: 🟠 HIGH  
**Issue**: Overriding response.json() method with improper context binding - NOW FIXED with bind()

```typescript
// Store original json method
const originalJson = res.json;

// Override json to cache response
res.json = function (data: any) {
    try {
        if (res.statusCode === 200) {
            redis.setex(cacheKey, ttl, JSON.stringify(data)).catch((err: any) => {
                logger.error(`Failed to cache response: ${err.message}`);
            });
        }
    } catch (error) {
        logger.error(`Cache middleware set error: ${(error as any).message}`);
    }

    res.set('X-Cache', 'MISS');
    return originalJson.call(this, data); // ❌ `this` context may be wrong
};
```

**Failure Scenario**:
- Cache middleware may override `this` context incorrectly
- Response headers not set properly
- Potential double-response sending
- Redis errors silently ignored (non-blocking)

---

### 12. **Error Handler Missing Context for Specific Errors** ✅ FIXED
**File**: [src/middlewares/errorHandler.ts](src/middlewares/errorHandler.ts#L10-L45)  
**Severity**: 🟠 HIGH  
**Issue**: Not all error types handled, generic fallback may leak sensitive info - NOW FIXED with better error handling

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

// Handle specific database errors with meaningful messages
let statusCode = err?.status ? err.status : 500;
let userMessage = 'Internal Server Error';

// ... specific error handling ...

} else if (statusCode >= 500) {
    // For 500+ errors, only expose message in development
    userMessage = isDevelopment ? (err?.message || 'Internal Server Error') : 'Internal Server Error';
} else {
    userMessage = err?.message || userMessage; // ❌ Exposes error.message to user
}
```

**Failure Scenario**:
- Unknown error types expose internal messages to frontend
- Stack traces visible in development (can be left on in production)
- No error tracking (Sentry, etc.) integration
- Database connection errors (e.g., ECONNREFUSED) returned as generic 500

---

### 13. **Rate Limiter Memory Leak Prevention Relies on Cleanup** ✅ FIXED
**File**: [src/middlewares/rateLimiter.ts](src/middlewares/rateLimiter.ts#L174-L181)  
**Severity**: 🟠 HIGH  
**Issue**: Periodic cleanup is best-effort, no guarantees - NOW FIXED with max size enforcement

```typescript
// Periodic cleanup of expired blocks to avoid memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, info] of blockedMap.entries()) {
        if (info.blockedUntil <= now) blockedMap.delete(key);
    }
}, CLEANUP_INTERVAL).unref(); // ❌ .unref() means cleanup won't prevent process exit
```

**Failure Scenario**:
- If process is about to exit, cleanup timer is unref'd and may not run
- Memory can accumulate until process restart
- High-traffic application may run out of memory
- No max-size enforcement on blockedMap

---

### 14. **CORS Hardcoded Origins Missing Env Configuration** ✅ FIXED
**File**: [src/middlewares/cors.ts](src/middlewares/cors.ts#L3-L10)  
**Severity**: 🟠 HIGH  
**Issue**: Allowed origins hardcoded, not configurable via environment - NOW FIXED with ENV variable support

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://adms4.ranhilltechnologies.com.my',
  'http://100.1.1.129',
  'http://localhost:8080',
  'https://serv.ranhilltechnologies.com.my',
  'https://aqs.ranhilltechnologies.com.my',
];
```

**Failure Scenario**:
- Adding new frontend origin requires code change + redeploy
- Test origins left in production (localhost:5173, 100.1.1.129)
- No dynamic origin loading from ENV
- Cannot disable CORS for specific environments

---

### 15. **Socket.IO Auth Missing User Validation** ✅ FIXED
**File**: [src/server.ts](src/server.ts#L27-L35)  
**Severity**: 🟠 HIGH  
**Issue**: Socket authenticated only by JWT token, no session validation - NOW FIXED with session token validation

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) { next(new Error('unauthorized')); return; }
  try {
    if (!process.env.JWT_SECRET) throw new Error('Missing JWT secret');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    (socket as any).userId = decoded.userId; // ❌ No session validation
    next();
  } catch (err) {
    logger.error('Socket auth failed', err);
    next(new Error('unauthorized'));
  }
});
```

**Failure Scenario**:
- Socket can connect with old expired JWT tokens if verify doesn't check expiration
- Single-session enforcement doesn't apply to WebSocket
- Logout doesn't disconnect active WebSocket connections
- No re-authentication on token refresh

---

### 16. **Database Connection Test Doesn't Block Server Start** ✅ FIXED
**File**: [src/server.ts](src/server.ts#L63-L70)  
**Severity**: 🟠 HIGH  
**Issue**: Server starts even if database is unreachable - NOW FIXED with blocking connection check

```typescript
testConnection().then((isConnected) => {
  if (isConnected) {
    logger.info('✅ Database connection test successful');
    startPeriodicHealthCheck(30000, io);
  } else {
    logger.error('⚠️ Database connection test failed - server starting anyway'); // ❌ Still starts
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info(`Server is running on port ${PORT}`);
});
```

**Failure Scenario**:
- Server accepts requests but cannot fulfill them
- Database errors at runtime cause cascade failures
- Health check shows degraded but clients don't know
- No graceful shutdown on persistent DB unavailability

---

## 🟡 MEDIUM SEVERITY FAILURES

### 17. **Activation Code Generation Not Unique Per User** ✅ FIXED
**File**: [src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts#L125-L134)  
**Severity**: 🟡 MEDIUM  
**Issue**: Multiple activation codes can exist for same email - NOW FIXED by generating fresh codes on each resend

```typescript
if (Number(userType) === 1) {
    // Employee: ensure activation_code present & (re)send activation email
    let activationCode = pending.activation_code;
    if (!activationCode) {
        activationCode = crypto.randomBytes(32).toString('hex');
        await pool.query('UPDATE pending_users SET activation_code = ?, status = 2 WHERE id = ?', [activationCode, pending.id]);
    }
```

**Failure Scenario**:
- Resending doesn't invalidate old codes
- Old codes remain valid indefinitely
- User could activate with any old code

---

### 18. **Password Reset Token Management** ✅ FIXED
**File**: [src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts#L697-L750)  
**Severity**: 🟡 MEDIUM  
**Issue**: Reset tokens not properly invalidated - NOW FIXED with token expiration and invalidation on verification

**Risk Areas**:
- No expiration on reset tokens
- Multiple reset tokens can exist
- No rate limiting on verification attempts
- Token reuse possible

---

### 19. **Group Fetch Failures Don't Prevent User Features** ✅ FIXED
**File**: [src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts#L475-L530)  
**Severity**: 🟡 MEDIUM  
**Issue**: User navigation built from groups, but group failures ignored - NOW FIXED with try-catch error handling

```typescript
let groupNames: string[] = [];
try {
    const groupIds = await adminModel.getGroupsByUserId(newUserId);
    groupNames = (await Promise.all(...)).filter(Boolean) as string[];
} catch (groupFetchError: any) {
    logger.warn('Warning: Could not fetch user groups:', groupFetchError.message);
    // Continue with activation - group names not critical for email
}
```

**Failure Scenario**:
- User activates without proper groups assigned
- Navigation tree empty even though groups exist
- Group assignment race condition

---

### 20. **No Request Size Validation** ✅ FIXED
**File**: [src/app.ts](src/app.ts#L65-L73)  
**Severity**: 🟡 MEDIUM  
**Issue**: Parser limits were 500MB for both URL-encoded and JSON - NOW FIXED with environment-driven configuration (default 10MB)

```typescript
app.use(urlencoded({ extended: true, limit: '500mb' }));
app.use(json({ limit: '500mb' }));
```

**Failure Scenario**:
- Malicious actor sends 500MB JSON payload
- Server memory exhausted processing
- No validation of individual field sizes
- Multer file upload limit (500MB) matches parser limit

---

### 21. **No Logout Token Invalidation** ✅ FIXED
**File**: [src/p.auth/adms/authController.ts](src/p.auth/adms/authController.ts#L824-L855) & [src/utils/tokenBlacklist.ts](src/utils/tokenBlacklist.ts)  
**Severity**: 🟡 MEDIUM  
**Issue**: JWT tokens were not invalidated on logout - NOW FIXED with session token clearing and token blacklist utility for enhanced security

---

### 22. **Missing Input Validation on Some Endpoints** ✅ FIXED
**File**: [src/p.auth/adms/authRoutes.ts](src/p.auth/adms/authRoutes.ts#L50-L76)  
**Severity**: 🟡 MEDIUM  
**Issue**: Admin endpoints missing parameter validation - NOW FIXED with strict type checks and format validation

```typescript
router.post('/admin/rate-limit/unblock', tokenValidator, asyncHandler(async (req, res) => {
    const { ip, key, route, userAgent } = req.body || {};
    let ok = false;
    if (typeof key === 'string' && key.trim()) {
        ok = clearClientBlockByKey(key.trim());
    } else if (ip && userAgent && route) { // ❌ No typeof checks
        ok = clearClientBlockByParams(String(ip), String(userAgent), String(route));
```

**Failure Scenario**:
- Invalid IP/userAgent formats accepted
- String injection possible
- Admin endpoint has limited validation

---

## 🔵 LOW SEVERITY / BEST PRACTICES

### 23. **Logging Level Not Respecting NODE_ENV**
**File**: [src/middlewares/rateLimiter.ts](src/middlewares/rateLimiter.ts#L196-L205)  
**Issue**: Rate limit handler logs to console, should use logger

```typescript
const retryAfterSec = Math.ceil(BLOCK_DURATION / 1000);
res.setHeader('Retry-After', String(retryAfterSec));
res.status(429).json({
    message: `Rate limit exceeded. Please retry in ${retryAfterSec} seconds.`,
    retryAfter: retryAfterSec,
    status: 'error'
});
```

---

### 24. **No Prometheus Metrics**
**Severity**: 🔵 LOW  
**Issue**: No metrics endpoint for monitoring
- No request count tracking
- No response time histograms
- Cannot build dashboards for uptime/SLA

---

### 25. **No Request ID Tracking**
**Severity**: 🔵 LOW  
**Issue**: Cannot trace requests across logs
- No request correlation ID
- Distributed tracing impossible
- Support cannot correlate user issues with logs

---

## 📋 SUMMARY TABLE

| # | Component | Issue | Severity | Impact |
|---|-----------|-------|----------|--------|
| 1 | tokenValidator | Missing JWT_SECRET error | 🔴 CRITICAL | Auth bypass |
| 2 | tokenValidator | Silent session check errors | 🔴 CRITICAL | Undetectable failures |
| 3 | authController | Invalid FRONTEND_URL crashes server | 🔴 CRITICAL | Complete outage |
| 4 | rsaDecrypt | No audit trail for decryption | 🔴 CRITICAL | Security blind spot |
| 5 | asyncHandler | Missing return statement | 🟠 HIGH | Promise handling issues |
| 6 | authController | Login status check weak | 🔴 CRITICAL | Account access control |
| 7 | authController | Single-session race condition | 🟠 HIGH | Policy violation |
| 8 | authController | URL sanitization regex flaw | 🟠 HIGH | Activation link failure |
| 9 | authController | Email failures silently ignored | 🟠 HIGH | User confusion |
| 10 | dbHealthCheck | No query timeout | 🟠 HIGH | Blocking health checks |
| 11 | cacheMiddleware | JSON override context issues | 🟠 HIGH | Response corruption |
| 12 | errorHandler | Error message exposure | 🟠 HIGH | Info disclosure |
| 13 | rateLimiter | Memory leak potential | 🟠 HIGH | Resource exhaustion |
| 14 | cors | Hardcoded origins | 🟠 HIGH | Deployment friction |
| 15 | server.ts | Socket.IO no session validation | 🟠 HIGH | WebSocket security |
| 16 | server.ts | DB connection doesn't block start | 🟠 HIGH | Degraded startup |
| 17 | authController | Activation codes not unique | 🟡 MEDIUM | Account takeover risk |
| 18 | authController | Password reset tokens | 🟡 MEDIUM | Token reuse |
| 19 | authController | Group fetch failures | 🟡 MEDIUM | Feature degradation |
| 20 | app.ts | Request size unlimited | 🟡 MEDIUM | DoS vector |
| 21 | authController | No token invalidation | 🟡 MEDIUM | Session hijacking |
| 22 | authRoutes | Admin endpoint validation | 🟡 MEDIUM | Input injection |

---

## 🚀 RECOMMENDED FIXES (Priority Order)

### Phase 1: CRITICAL (Immediate)
1. Add timeout to database health checks
2. Fix login activation status validation logic
3. Add return statement to asyncHandler
4. Fix tokenValidator error handling and logging
5. Remove session enforcement or fix race condition

### Phase 2: HIGH (This Sprint)
1. Make CORS origins configurable via ENV
2. Add database query timeouts globally
3. Implement Socket.IO session validation
4. Fix email failure notifications
5. Add rate limit map size enforcement

### Phase 3: MEDIUM (Next Sprint)
1. Implement token blacklist on logout
2. Add input validation helpers
3. Implement activation code expiration
4. Add password reset token management
5. Add request correlation IDs

### Phase 4: LOW (Backlog)
1. Add Prometheus metrics endpoint
2. Implement distributed tracing
3. Add Circuit breaker for external services
4. Performance monitoring dashboard

---

## Testing Checklist

- [ ] Test tokenValidator without JWT_SECRET
- [ ] Test login with simultaneous requests (race condition)
- [ ] Test with invalid FRONTEND_URL env var
- [ ] Test email service downtime scenarios
- [ ] Test database connection timeout
- [ ] Test Socket.IO with expired token
- [ ] Test rate limiter with memory pressure
- [ ] Test cache middleware response corruption
- [ ] Test error handler with unknown error types
- [ ] Test CORS with new origin addition

