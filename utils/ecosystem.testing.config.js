module.exports = {
  apps: [
    {
      cwd: '/home/webadmin/www/testing/post-api/current',
      name: 'post-api',
      script: 'yarn',
      args: 'startt',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      env_testing: {
        NODE_ENV: 'testing'
      },
      exec_mode: 'fork'
    }
  ]
}
