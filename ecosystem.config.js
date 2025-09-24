module.exports = {
  apps: [
    {
      name: 'express-ts',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M', // Adjust as needed
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
