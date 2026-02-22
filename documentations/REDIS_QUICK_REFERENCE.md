# Redis Enable/Disable - Quick Reference

## TL;DR

Add to your `.env` file:

```bash
# Enable Redis (default, recommended for production)
REDIS_ENABLED=true

# Disable Redis (useful for development, testing, or simplified deployments)
REDIS_ENABLED=false
```

**No code changes needed. Restart your app.**

---

## Quick Start

### Development (No Redis Required)
```bash
REDIS_ENABLED=false
```
✅ App works without Redis dependency
✅ Simpler local development
✅ No need to run Redis server

### Production (With Redis)
```bash
REDIS_ENABLED=true
REDIS_HOST=your.redis.server
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```
✅ Caching enabled for better performance
✅ Reduced database load
✅ Faster response times for repeated requests

---

## Environment Variables

```bash
# Required
REDIS_ENABLED=true/false          # Default: true

# Optional (only used if REDIS_ENABLED=true)
REDIS_HOST=localhost              # Default: localhost
REDIS_PORT=6379                   # Default: 6379
REDIS_PASSWORD=                   # Default: none
REDIS_DB=0                        # Default: 0
```

---

## What Changes

### With `REDIS_ENABLED=true`
- Redis server must be running
- All responses are cached
- Repeated requests return cached data (faster)
- Database load is reduced
- `X-Cache` headers show HIT/MISS

### With `REDIS_ENABLED=false`
- No Redis needed
- Every request fetches fresh data
- Slower for repeated requests
- Higher database load
- App continues to work normally

---

## Files to Know

- **Config**: `src/utils/redisConfig.ts`
- **Full Docs**: `REDIS_CONFIGURATION.md`
- **Implementation**: `REDIS_DISABLE_IMPLEMENTATION.md`
- **Example**: `.env.redis.example`

---

## Verify It's Working

### Check startup logs

**Redis Enabled:**
```
[INFO] Redis initialized and connected
[INFO] Redis connected successfully
```

**Redis Disabled:**
```
[INFO] Redis is disabled (REDIS_ENABLED=false)
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "Can't connect to Redis" | Set `REDIS_ENABLED=false` or check Redis server |
| Cache not working | Verify `REDIS_ENABLED=true` and Redis is running |
| Slow API responses | Enable Redis: `REDIS_ENABLED=true` |
| Complex deployment | Disable Redis: `REDIS_ENABLED=false` |

---

## Migration from Always-On Redis

If Redis was always enabled before:

1. Nothing to do! It's still enabled by default
2. Or disable it: `REDIS_ENABLED=false`
3. No code changes required
4. Restart app

---

**For detailed documentation, see `REDIS_CONFIGURATION.md`**
