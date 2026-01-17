# Redis Enable/Disable Configuration Guide

## Overview

Redis is now fully configurable to be **enabled or disabled** via environment variables without modifying any codebase files. This allows you to run the application with or without Redis caching capabilities.

## How to Enable/Disable Redis

### Method 1: Environment Variable

Set the `REDIS_ENABLED` environment variable in your `.env` file:

```bash
# Enable Redis (default behavior if not specified)
REDIS_ENABLED=true

# Disable Redis
REDIS_ENABLED=false
```

### Method 2: Default Behavior

If `REDIS_ENABLED` is not specified:
- **Default**: `true` (Redis is **enabled**)
- To disable, explicitly set `REDIS_ENABLED=false`

## Configuration Details

### Redis Connection Settings

When Redis is **enabled**, configure these optional environment variables:

```bash
# Redis host (default: localhost)
REDIS_HOST=localhost

# Redis port (default: 6379)
REDIS_PORT=6379

# Redis password (optional, default: empty)
REDIS_PASSWORD=your_redis_password

# Redis database number (default: 0)
REDIS_DB=0
```

### Complete .env Example

```bash
# Enable/Disable Redis
REDIS_ENABLED=true

# Redis connection settings (used only if REDIS_ENABLED=true)
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_password
REDIS_DB=0
```

## What Happens When Redis is Disabled

When `REDIS_ENABLED=false`:

1. **No Redis connection** - The application won't attempt to connect to Redis
2. **Dummy Redis instance** - A dummy Redis implementation is used that simulates Redis but doesn't store data
3. **Cache operations are no-ops** - All cache operations (set, get, del, etc.) complete successfully but don't cache anything
4. **Graceful fallback** - The application continues to work normally; endpoints return fresh data instead of cached data
5. **Logging** - Debug logs show `[Redis Disabled]` and `[Cache Disabled]` messages

## Implementation Details

### Files Modified

1. **`src/utils/redisConfig.ts`** (NEW)
   - Configuration file that reads `REDIS_ENABLED` from environment
   - Defines all Redis connection parameters

2. **`src/utils/redis.ts`**
   - Conditionally creates real Redis or dummy Redis based on `REDIS_ENABLED`
   - Dummy Redis mimics Redis interface without actual caching

3. **`src/utils/cacheService.ts`**
   - Added `isEnabled()` method to check if caching is active
   - All cache operations check if Redis is enabled before executing

4. **`src/middlewares/cacheMiddleware.ts`**
   - Skips cache middleware entirely when `REDIS_ENABLED=false`
   - Prevents unnecessary overhead

5. **`src/app.ts`**
   - Conditionally initializes Redis connection only if enabled
   - Logs status of Redis configuration on startup

## Performance Considerations

### With Redis Enabled (`REDIS_ENABLED=true`)
- ✅ **Faster response times** for repeated requests (cache hits)
- ✅ **Reduced database load** 
- ✅ **Better scalability** for high-traffic scenarios
- ⚠️ Requires Redis server running

### With Redis Disabled (`REDIS_ENABLED=false`)
- ✅ **No Redis dependency** - simpler deployment
- ✅ **No infrastructure overhead** for small applications
- ⚠️ Every request fetches fresh data from database
- ⚠️ Higher database load for repeated requests

## Use Cases

### Enable Redis (`REDIS_ENABLED=true`)
- Production environments with high traffic
- API with many repeated requests for the same data
- Performance-critical applications
- Microservices architecture

### Disable Redis (`REDIS_ENABLED=false`)
- Development environments
- Testing without Redis dependency
- Single-server deployments with low traffic
- Debugging issues (to isolate database vs cache problems)
- Reduced operational complexity

## Testing Redis Configuration

### Test with Redis Enabled

1. Set environment variable:
   ```bash
   REDIS_ENABLED=true
   ```

2. Start the application:
   ```bash
   npm run dev
   ```

3. Check startup logs for:
   ```
   Redis initialized and connected
   Redis connected successfully
   ```

### Test with Redis Disabled

1. Set environment variable:
   ```bash
   REDIS_ENABLED=false
   ```

2. Start the application:
   ```bash
   npm run dev
   ```

3. Check startup logs for:
   ```
   Redis is disabled (REDIS_ENABLED=false)
   ```

4. Verify API still works normally - all endpoints should function without caching

## API Behavior

### Cache Headers

When caching is **enabled**, responses include cache status header:
```
X-Cache: HIT    (served from cache)
X-Cache: MISS   (freshly fetched)
```

When caching is **disabled**, the header may be omitted or shows:
```
X-Cache: DISABLED
```

## Logging

### Redis Enabled Logs
```
[INFO] Redis connected successfully
[DEBUG] Cache hit: route:/api/users
[DEBUG] Cache miss: route:/api/users
```

### Redis Disabled Logs
```
[INFO] Redis is disabled (REDIS_ENABLED=false)
[DEBUG] [Redis Disabled] Skipping cache middleware
[DEBUG] [Cache Disabled] Would set: key
```

## Migration Guide

If you were previously using Redis and want to disable it:

1. **Stop Redis server** (optional)
2. **Set environment variable**:
   ```bash
   REDIS_ENABLED=false
   ```
3. **Restart application** - no code changes needed
4. **Verify** - all endpoints continue to work

## Troubleshooting

### Redis enabled but not connecting

```
[ERROR] Redis connection error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
- Check Redis server is running: `redis-cli ping`
- Verify `REDIS_HOST` and `REDIS_PORT` are correct
- Check firewall allows Redis connection
- Or set `REDIS_ENABLED=false` to disable Redis

### Inconsistent cache behavior

```
Some requests return cached data, others return fresh data
```

**Solution:**
- Verify `REDIS_ENABLED=true` in .env
- Check Redis connection is stable
- Restart application to clear any inconsistent state

### Performance issue with Redis disabled

**Expected behavior** - application is slower without caching

**Solution:**
- Enable Redis for production: `REDIS_ENABLED=true`
- Ensure Redis server is deployed and accessible
- Monitor database query performance

## Summary

Redis enable/disable is now fully configurable through the `REDIS_ENABLED` environment variable. No code modifications are needed to switch between cached and non-cached modes.

| Feature | With Redis | Without Redis |
|---------|-----------|--------------|
| Configuration | `REDIS_ENABLED=true` | `REDIS_ENABLED=false` |
| Caching | ✅ Active | ❌ Disabled |
| Cache Headers | Included | Omitted |
| Dependencies | Redis server required | None |
| Database Load | Lower | Higher |
| Response Time | Faster (hits) | Consistent |
| Deployment | More complex | Simpler |
