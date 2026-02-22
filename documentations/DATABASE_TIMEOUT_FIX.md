# Database Connection Timeout Fix

## Problem Summary

The production server was experiencing `ETIMEDOUT` errors that caused the API to stop responding. The error occurred in the route tracking functionality (`routeTracker`) when attempting to update user navigation paths.

**Error Details:**
```
Error tracking route: Error: read ETIMEDOUT
    at PromisePool.query (/home/superadmin/express-ts/node_modules/mysql2/lib/promise/pool.js:36:22)
    at routeTracker (/home/superadmin/express-ts/dist/p.nav/navModel.js:36:42)
```

**Error Code:** `ETIMEDOUT` (errno: -110)

## Root Causes

1. **No connection timeouts configured** - Database pool had no timeout limits, causing indefinite hangs
2. **No connection pool limits** - Unlimited connections could exhaust database resources
3. **Blocking route tracking** - Route tracking was synchronous, blocking API responses
4. **No error recovery** - Timeout errors crashed the application instead of graceful recovery
5. **No connection health monitoring** - No visibility into database connection issues

## Solutions Implemented

### 1. Enhanced Database Pool Configuration (`src/utils/db.ts`)

Added comprehensive timeout and connection pool settings:

```typescript
const poolConfig = {
  // Connection pool limits
  connectionLimit: 10,           // Max 10 concurrent connections
  maxIdle: 10,                   // Max 10 idle connections
  idleTimeout: 60000,            // Close idle connections after 60s
  queueLimit: 0,                 // No queue limit (fail fast)
  
  // Timeout settings
  connectTimeout: 10000,         // 10s to establish connection
  acquireTimeout: 10000,         // 10s to acquire from pool
  timeout: 30000,                // 30s for query execution
  
  // Connection health
  enableKeepAlive: true,         // Keep connections alive
  keepAliveInitialDelay: 0,
  
  // Retry configuration
  waitForConnections: true,      // Wait if pool is full
};
```

**Benefits:**
- Prevents indefinite hangs with explicit timeouts
- Controls resource usage with connection limits
- Maintains connection health with keep-alive
- Fails fast when database is unavailable

### 2. Timeout Protection for Route Tracking (`src/p.nav/navModel.ts`)

Wrapped `routeTracker` with timeout protection and error recovery:

```typescript
export const routeTracker = async (path: string, userId: number): Promise<void> => {
  const timeoutMs = 5000; // 5 second timeout
  
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Route tracking timeout')), timeoutMs);
    });

    const queryPromise = pool.query(
      `UPDATE auth.users SET last_nav = ? WHERE id = ?`,
      [path, userId]
    );

    const [result]: any = await Promise.race([queryPromise, timeoutPromise]);
    
    if (result.affectedRows === 0) {
      console.warn(`Route tracking: No user found with id: ${userId}`);
    }
  } catch (error: any) {
    // Log but don't throw - route tracking is non-critical
    if (error.code === 'ETIMEDOUT' || error.errno === -110) {
      console.error('Route tracking database timeout (ETIMEDOUT):', {
        userId,
        path,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Error tracking route:', error);
    }
    // Do not re-throw - this prevents app crashes
  }
};
```

**Benefits:**
- 5-second timeout prevents indefinite hangs
- Graceful error handling prevents crashes
- Detailed logging for debugging
- Non-critical operation won't affect user experience

### 3. Non-Blocking Route Tracking (`src/p.nav/navController.ts`)

Changed route tracking to fire-and-forget pattern:

```typescript
export const trackRoute = async (req: Request, res: Response): Promise<Response> => {
    const { path, userId } = req.body;

    if (!path || !userId) {
        return res.status(400).json({ 
            status: 'error',
            message: 'Path and userId are required' 
        });
    }

    // Fire-and-forget: don't await, respond immediately
    routeTracker(path, userId).catch((error) => {
        console.error('Background route tracking failed:', error);
    });

    // Respond immediately without waiting for database operation
    return res.status(200).json({ 
        status: 'success',
        message: 'Route tracked successfully' 
    });
};
```

**Benefits:**
- API responds immediately (no blocking)
- Route tracking happens in background
- User experience not affected by database issues
- Unhandled promise rejections caught

### 4. Database Health Monitoring (`src/utils/dbHealthCheck.ts`)

Created comprehensive health check utilities:

**Features:**
- `checkDatabaseHealth()` - Test both database connections with latency measurement
- `startPeriodicHealthCheck()` - Continuous monitoring with configurable intervals
- `testConnection()` - Quick connection test with timeout
- Automatic logging of connection issues and high latency

**Health Check Endpoint (`/api/health`):**
```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-02T10:30:00.000Z",
  "uptime": 3600.5,
  "database": {
    "pool1": {
      "connected": true,
      "latency": 45
    },
    "pool2": {
      "connected": true,
      "latency": 52
    }
  }
}
```

### 5. Server Startup Integration (`src/server.ts`)

Added automatic health checks on startup and periodic monitoring:

```typescript
// Test database connection before starting server
testConnection().then((isConnected) => {
  if (isConnected) {
    logger.info('✅ Database connection test successful');
    // Start periodic health monitoring (every 30 seconds)
    startPeriodicHealthCheck(30000);
  } else {
    logger.error('⚠️ Database connection test failed - server starting anyway');
  }
});
```

**Benefits:**
- Immediate visibility into connection issues on startup
- Continuous monitoring every 30 seconds
- Proactive alerts for high latency or disconnections
- Server starts even if database is temporarily unavailable

## Deployment Instructions

### For Production Server

1. **Pull the latest changes:**
   ```bash
   cd /home/superadmin/express-ts
   git pull origin main
   ```

2. **Install dependencies (if needed):**
   ```bash
   npm install
   ```

3. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

4. **Restart the server with PM2:**
   ```bash
   pm2 restart express-ts
   ```

5. **Monitor logs for health checks:**
   ```bash
   pm2 logs express-ts
   ```

6. **Test the health endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   ```

### Monitoring Commands

**Check current database health:**
```bash
curl http://localhost:3000/api/health | jq
```

**Watch server logs:**
```bash
pm2 logs express-ts --lines 100
```

**Check for timeout errors:**
```bash
pm2 logs express-ts | grep -i "timeout\|ETIMEDOUT"
```

**Monitor database connection status:**
```bash
pm2 logs express-ts | grep -i "database\|pool"
```

## Expected Improvements

1. **No More Crashes** - Route tracking timeouts won't crash the server
2. **Faster Response Times** - Non-blocking route tracking means instant API responses
3. **Better Visibility** - Health checks and detailed logging show connection issues
4. **Graceful Degradation** - Database issues affect only non-critical features
5. **Proactive Monitoring** - Continuous health checks alert you to problems early

## Configuration Options

### Environment Variables (Optional)

You can fine-tune the database pool settings in `.env`:

```env
# Database Pool Configuration
DB_CONNECTION_LIMIT=10
DB_IDLE_TIMEOUT=60000
DB_CONNECT_TIMEOUT=10000
DB_QUERY_TIMEOUT=30000

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
```

### Adjusting Timeouts

To change timeouts, edit `src/utils/db.ts`:

```typescript
// Increase query timeout for slow queries
timeout: 60000, // 60 seconds instead of 30

// Decrease for faster failure detection
timeout: 15000, // 15 seconds
```

To change route tracking timeout, edit `src/p.nav/navModel.ts`:

```typescript
const timeoutMs = 10000; // 10 seconds instead of 5
```

## Testing

### Test Route Tracking (should respond immediately):
```bash
curl -X POST http://localhost:3000/api/nav/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"path": "/dashboard", "userId": 1}'
```

### Test Database Health:
```bash
curl http://localhost:3000/api/health | jq
```

### Simulate Database Issues:

1. **Stop MySQL temporarily:**
   ```bash
   sudo systemctl stop mysql
   ```

2. **Check health endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Try route tracking (should not crash):**
   ```bash
   # Server should still respond, route tracking fails gracefully
   curl -X POST http://localhost:3000/api/nav/track ...
   ```

4. **Restart MySQL:**
   ```bash
   sudo systemctl start mysql
   ```

5. **Verify recovery:**
   ```bash
   curl http://localhost:3000/api/health
   ```

## Troubleshooting

### Server Still Timing Out?

1. **Check MySQL server status:**
   ```bash
   sudo systemctl status mysql
   ```

2. **Check MySQL connection limits:**
   ```sql
   SHOW VARIABLES LIKE 'max_connections';
   SHOW STATUS LIKE 'Threads_connected';
   ```

3. **Increase MySQL connection limit if needed:**
   ```bash
   # Edit MySQL config
   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
   
   # Add or modify:
   max_connections = 200
   
   # Restart MySQL
   sudo systemctl restart mysql
   ```

4. **Check network latency:**
   ```bash
   ping -c 10 YOUR_DB_HOST
   ```

5. **Verify database credentials:**
   ```bash
   mysql -h YOUR_DB_HOST -u YOUR_DB_USER -p YOUR_DB_NAME
   ```

### High Latency Warnings?

If you see "Database latency is HIGH" warnings:

1. **Optimize slow queries:**
   ```sql
   -- Enable slow query log
   SET GLOBAL slow_query_log = 'ON';
   SET GLOBAL long_query_time = 2;
   
   -- Check slow queries
   SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;
   ```

2. **Check for missing indexes:**
   ```sql
   -- Analyze table
   ANALYZE TABLE auth.users;
   ```

3. **Consider increasing timeout if queries are legitimately slow:**
   ```typescript
   timeout: 60000, // 60 seconds in src/utils/db.ts
   ```

### Log Analysis

**Find all timeout errors:**
```bash
pm2 logs express-ts --lines 1000 | grep -i "ETIMEDOUT" -A 5 -B 5
```

**Check health check results:**
```bash
pm2 logs express-ts --lines 1000 | grep "Database health"
```

**Monitor route tracking issues:**
```bash
pm2 logs express-ts --lines 1000 | grep "route tracking"
```

## Additional Recommendations

1. **Set up monitoring alerts** - Use tools like Prometheus + Grafana to alert on health check failures

2. **Configure log rotation** - PM2 logs can grow large:
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

3. **Regular database maintenance:**
   ```sql
   -- Run weekly
   OPTIMIZE TABLE auth.users;
   ANALYZE TABLE auth.navigation;
   ```

4. **Consider Redis for route tracking** - For high-traffic applications, store route tracking in Redis instead of MySQL

5. **Load testing** - Test with tools like Apache Bench or k6:
   ```bash
   ab -n 1000 -c 10 http://localhost:3000/api/health
   ```

## Summary

These changes make the API resilient to database connection issues by:
- ✅ Adding explicit timeouts to prevent indefinite hangs
- ✅ Implementing graceful error recovery
- ✅ Making non-critical operations non-blocking
- ✅ Providing visibility through health checks and logging
- ✅ Ensuring the server stays responsive even when the database is slow

The server will now continue serving requests even if route tracking or database operations timeout, and you'll have clear visibility into connection health.
