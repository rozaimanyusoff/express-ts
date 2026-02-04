/**
 * Token Blacklist for Logout Functionality
 * Point 21 FIX: Invalidate JWT tokens on logout to prevent session hijacking
 * 
 * In-memory implementation suitable for single-server deployments.
 * For distributed systems, use Redis or database-backed blacklist.
 */

interface BlacklistEntry {
  expiresAt: number;
  addedAt: number;
}

const tokenBlacklist = new Map<string, BlacklistEntry>();

/**
 * Add token to blacklist (on logout)
 */
export const addToBlacklist = (token: string, expiresAt?: number): void => {
  const expiration = expiresAt || (Date.now() + 60 * 60 * 1000); // Default 1 hour
  tokenBlacklist.set(token, {
    addedAt: Date.now(),
    expiresAt: expiration
  });
};

/**
 * Check if token is blacklisted
 */
export const isTokenBlacklisted = (token: string): boolean => {
  const entry = tokenBlacklist.get(token);
  if (!entry) return false;
  
  // Remove if expired
  if (Date.now() > entry.expiresAt) {
    tokenBlacklist.delete(token);
    return false;
  }
  
  return true;
};

/**
 * Get blacklist stats for monitoring
 */
export const getBlacklistStats = () => {
  return {
    activeTokens: tokenBlacklist.size,
    timestamp: new Date().toISOString()
  };
};

/**
 * Periodic cleanup of expired tokens (run every 5 minutes)
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [token, entry] of tokenBlacklist.entries()) {
    if (now > entry.expiresAt) {
      tokenBlacklist.delete(token);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[TokenBlacklist] Cleaned up ${cleaned} expired tokens`);
  }
}, 5 * 60 * 1000);

// Prevent this interval from keeping the process alive
cleanupInterval.unref();

export default {
  addToBlacklist,
  isTokenBlacklisted,
  getBlacklistStats
};
