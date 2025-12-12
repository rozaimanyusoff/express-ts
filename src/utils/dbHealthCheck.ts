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
 * Periodic health check that logs warnings when database is slow or disconnected
 * @param intervalMs - Interval in milliseconds (default: 30000 = 30 seconds)
 */
export const startPeriodicHealthCheck = (intervalMs = 30000): NodeJS.Timeout => {
  console.log(`Starting database health monitoring (interval: ${intervalMs}ms)`);
  
  return setInterval(async () => {
    const health = await checkDatabaseHealth();
    
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
  testConnection
};
