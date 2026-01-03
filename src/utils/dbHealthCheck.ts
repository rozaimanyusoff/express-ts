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
 * Check database connection health
 * Returns connection status and latency for both pools
 */
export const checkDatabaseHealth = async (): Promise<HealthCheckResult> => {
  const result: HealthCheckResult = {
    pool1: { connected: false },
    pool2: { connected: false }
  };

  // Check pool 1
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latency = Date.now() - start;
    result.pool1 = { connected: true, latency };
  } catch (error: any) {
    result.pool1 = { 
      connected: false, 
      error: error.message || 'Connection failed' 
    };
    console.error('Database pool1 health check failed:', error);
  }

  // Check pool 2
  try {
    const start = Date.now();
    await pool2.query('SELECT 1');
    const latency = Date.now() - start;
    result.pool2 = { connected: true, latency };
  } catch (error: any) {
    result.pool2 = { 
      connected: false, 
      error: error.message || 'Connection failed' 
    };
    console.error('Database pool2 health check failed:', error);
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
