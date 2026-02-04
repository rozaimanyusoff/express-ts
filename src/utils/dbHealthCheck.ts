import { Server } from 'socket.io';
import { pool, pool2 } from './db';

interface HealthCheckResult {
  pool1: {
    connected: boolean;
    error?: string;
    latency?: number;
  };
  pool2: {
    connected: boolean;
    error?: string;
    latency?: number;
  };
}

interface HealthCheckResponse extends HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  message?: string;
}

/**
 * Check database connection health with timeout protection
 * Returns connection status and latency for both pools
 */
export const checkDatabaseHealth = async (): Promise<HealthCheckResult> => {
  const result: HealthCheckResult = {
    pool1: { connected: false },
    pool2: { connected: false }
  };

  const DB_QUERY_TIMEOUT = 5000; // 5 second timeout per query

  // Helper function to run query with timeout
  const queryWithTimeout = async (pool: any, poolName: string): Promise<{ latency: number } | { error: string }> => {
    const start = Date.now();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${poolName} query timeout (${DB_QUERY_TIMEOUT}ms)`)), DB_QUERY_TIMEOUT)
    );
    
    try {
      await Promise.race([pool.query('SELECT 1'), timeoutPromise]);
      const latency = Date.now() - start;
      return { latency };
    } catch (error: any) {
      return { error: error.message || 'Connection failed' };
    }
  };

  // Check pool 1
  const pool1Result = await queryWithTimeout(pool, 'pool1');
  if ('error' in pool1Result) {
    result.pool1 = { connected: false, error: pool1Result.error };
    console.error('Database pool1 health check failed:', pool1Result.error);
  } else {
    result.pool1 = { connected: true, latency: pool1Result.latency };
  }

  // Check pool 2
  const pool2Result = await queryWithTimeout(pool2, 'pool2');
  if ('error' in pool2Result) {
    result.pool2 = { connected: false, error: pool2Result.error };
    console.error('Database pool2 health check failed:', pool2Result.error);
  } else {
    result.pool2 = { connected: true, latency: pool2Result.latency };
  }

  return result;
};

/**
 * Determine overall health status
 */
const determineHealthStatus = (health: HealthCheckResult): 'healthy' | 'degraded' | 'unhealthy' => {
  const pool1Ok = health.pool1.connected && (!health.pool1.latency || health.pool1.latency <= 1000);
  const pool2Ok = health.pool2.connected && (!health.pool2.latency || health.pool2.latency <= 1000);

  if (pool1Ok && pool2Ok) return 'healthy';
  if (health.pool1.connected || health.pool2.connected) return 'degraded';
  return 'unhealthy';
};

/**
 * Periodic health check that broadcasts status via Socket.IO and logs warnings
 * @param intervalMs - Interval in milliseconds (default: 30000 = 30 seconds)
 * @param io - Socket.IO server instance for broadcasting health status
 */
export const startPeriodicHealthCheck = (intervalMs = 30000, io?: Server): NodeJS.Timeout => {
  console.log(`Starting database health monitoring (interval: ${intervalMs}ms)`);
  
  return setInterval(async () => {
    const health = await checkDatabaseHealth();
    const status = determineHealthStatus(health);
    
    // Build response for both logging and Socket.IO broadcast
    const healthResponse: HealthCheckResponse = {
      ...health,
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: status === 'healthy' ? 'All systems operational' : 
               status === 'degraded' ? 'One or more systems degraded' : 
               'Critical system issues'
    };

    // Broadcast to all connected clients via Socket.IO
    if (io) {
      io.emit('backend:health', healthResponse);
    }
    
    // Log warnings for any issues
    if (!health.pool1.connected) {
      console.error('⚠️ Database pool1 is DISCONNECTED:', health.pool1.error);
    } else if (health.pool1.latency && health.pool1.latency > 1000) {
      console.warn(`⚠️ Database pool1 latency is HIGH: ${health.pool1.latency}ms`);
    }
    
    if (!health.pool2.connected) {
      console.error('⚠️ Database pool2 is DISCONNECTED:', health.pool2.error);
    } else if (health.pool2.latency && health.pool2.latency > 1000) {
      console.warn(`⚠️ Database pool2 latency is HIGH: ${health.pool2.latency}ms`);
    }

    // Log healthy status periodically (every 5 minutes = 10 checks at 30s interval)
    const checkCount = Math.floor(Date.now() / intervalMs) % 10;
    if (checkCount === 0 && health.pool1.connected && health.pool2.connected) {
      console.log(`✅ Database health OK - Pool1: ${health.pool1.latency}ms, Pool2: ${health.pool2.latency}ms`);
    }
  }, intervalMs);
};

/**
 * Test database connection with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @returns true if connection is successful within timeout
 */
export const testConnection = async (timeoutMs = 5000): Promise<boolean> => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => { reject(new Error('Connection test timeout')); }, timeoutMs);
    });

    const testPromise = pool.query('SELECT 1');
    await Promise.race([testPromise, timeoutPromise]);
    
    return true;
  } catch (error: any) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
};

export default {
  checkDatabaseHealth,
  startPeriodicHealthCheck,
  testConnection,
  determineHealthStatus
};
