module.exports = {
  apps: [
    {
      cwd: '/home/webadmin/www/production/post-api/current',
      name: 'post-api',
      script: 'yarn',
      args: 'startp',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}
