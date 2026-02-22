module.exports = {
  apps: [
    {
      name: 'express-ts',
      script: 'dist/server.js',

      // ── Cluster ───────────────────────────────────────────────────────────
      instances: 'max',           // Use all CPU cores
      exec_mode: 'cluster',       // HTTP load-balanced across workers

      // ── Node.js Runtime ───────────────────────────────────────────────────
      // Removed --heapsnapshot-near-heap-limit: writes a heap dump file per
      // instance to disk when near OOM. Dangerous with instances:'max' in prod.
      // Re-enable only for targeted OOM debugging on a single instance.
      node_args: '--max-old-space-size=4096',

      // ── Memory ────────────────────────────────────────────────────────────
      // 200M was far too aggressive vs a 4096M heap — caused constant restarts.
      // 80% of heap (≈3276M) gives a safe ceiling before RSS bloat kills the process.
      max_memory_restart: '3000M',

      // ── Restart Behaviour ─────────────────────────────────────────────────
      autorestart: true,
      watch: false,
      // Exponential backoff prevents rapid crash loops from hammering the DB/OS
      exp_backoff_restart_delay: 100,   // Start at 100ms, doubles each restart up to 15s
      max_restarts: 15,                  // Give up after 15 consecutive crashes

      // ── Graceful Shutdown ─────────────────────────────────────────────────
      // Socket.IO needs time to drain active WebSocket connections on SIGINT/SIGTERM
      kill_timeout: 10000,              // Wait up to 10s for connections to close
      listen_timeout: 10000,            // Wait up to 10s for the server to bind on restart
      wait_ready: false,                // Set true and emit process.send('ready') in server.ts for zero-downtime reloads

      // ── Logs ──────────────────────────────────────────────────────────────
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,                 // Single log stream from all cluster instances
      time: true,                       // Prefix every log line with timestamp
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // ── Environment ───────────────────────────────────────────────────────
      env: {
        NODE_ENV: 'production',
        SERVER_PORT: 3030
      }
    }
  ]
};
