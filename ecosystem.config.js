export default {
  apps: [
    {
      name: 'express-ts',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      node_args: ['--max-old-space-size=4096', '--heapsnapshot-near-heap-limit=1'],
      autorestart: true,
      watch: false,
      max_memory_restart: '200M', // Adjust as needed
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
